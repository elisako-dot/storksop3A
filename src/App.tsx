import React, { useState, useEffect } from "react";
import PatientPortal from "./components/PatientPortal";
import AdminPortal from "./components/AdminPortal";
import { PricingDataset } from "./types";
import DynamicIcon from "./components/Icons";
import initialData from "./data/surgiprice_data.json";

export default function App() {
  const [data, setData] = useState<PricingDataset | null>(null);
  const [activeCategory, setActiveCategory] = useState("registration");
  const [viewMode, setViewMode] = useState<"patient" | "admin">("patient");
  const [isLoading, setIsLoading] = useState(true);
  const [isServerless, setIsServerless] = useState(false);

  // Fetch initial pricing details from fullstack Express API, with static / localStorage fallback
  const fetchPricingDetails = async () => {
    setIsLoading(true);
    
    // 1. Try to load local cache first for instant feedback/offline resilience
    const localCache = localStorage.getItem("surgiprice_local_data");
    if (localCache) {
      try {
        const parsed = JSON.parse(localCache);
        setData(parsed);
      } catch (err) {
        console.error("Failed to parse cached local pricing data:", err);
      }
    }

    try {
      const response = await fetch("/api/pricing-data");
      if (response.ok) {
        const result = await response.json();
        setData(result);
        localStorage.setItem("surgiprice_local_data", JSON.stringify(result));
        setIsServerless(false);
      } else {
        console.warn("Failed to fetch from API, using static/local fallback:", response.status);
        setIsServerless(true);
        if (!localCache) {
          setData(initialData as any);
        }
      }
    } catch (err) {
      console.warn("Express backend offline or serverless environment. Using static/local fallback.");
      setIsServerless(true);
      if (!localCache) {
        setData(initialData as any);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPricingDetails();
  }, []);

  // Save modified database to fullstack server or localStorage fallback
  const onSaveData = async (updatedDataset: PricingDataset): Promise<boolean> => {
    // Always persist to localStorage for instant client durability
    localStorage.setItem("surgiprice_local_data", JSON.stringify(updatedDataset));
    setData(updatedDataset);

    if (isServerless) {
      console.log("Client running in serverless mode. Preserved changes statically to LocalStorage.");
      return true;
    }

    try {
      const res = await fetch("/api/pricing-data", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedDataset),
      });
      if (res.ok) {
         return true;
      } else {
         console.warn("Backend failed to save. Changes remained safe in local browser storage.");
         return true;
      }
    } catch (err) {
      console.error("Failed to POST updated dataset. Storing locally instead:", err);
      return true;
    }
  };

  // Log in to administrator backoffice
  const onLogin = async (password: string): Promise<{ success: boolean; token?: string; error?: string }> => {
    if (isServerless) {
      const localPassword = localStorage.getItem("surgiprice_admin_password") || "admin";
      if (password === localPassword) {
        return { success: true, token: "admin-secret-token" };
      } else {
        return { success: false, error: "密碼錯誤 (本地獨立網頁端驗證)" };
      }
    }

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
      });
      const body = await res.json();
      return body;
    } catch (err) {
      const localPassword = localStorage.getItem("surgiprice_admin_password") || "admin";
      if (password === localPassword) {
        return { success: true, token: "admin-secret-token" };
      }
      return { success: false, error: "無法連線至伺服器驗證" };
    }
  };

  // Change administrative login password
  const onChangePassword = async (oldPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> => {
    if (isServerless) {
      const localPassword = localStorage.getItem("surgiprice_admin_password") || "admin";
      if (oldPassword === localPassword) {
        localStorage.setItem("surgiprice_admin_password", newPassword);
        return { success: true };
      } else {
        return { success: false, error: "舊密碼不正確 (本地獨立網頁端驗證)" };
      }
    }

    try {
      const res = await fetch("/api/admin/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ oldPassword, newPassword }),
      });
      const body = await res.json();
      if (body.success) {
        localStorage.setItem("surgiprice_admin_password", newPassword);
      }
      return body;
    } catch (err) {
      const localPassword = localStorage.getItem("surgiprice_admin_password") || "admin";
      if (oldPassword === localPassword) {
        localStorage.setItem("surgiprice_admin_password", newPassword);
        return { success: true };
      }
      return { success: false, error: "無法連線至伺服器修改（已為您暫存至本地瀏覽器）" };
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center font-sans">
        <div className="w-12 h-12 bg-rose-500 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-rose-100 animate-bounce mb-4">
          <DynamicIcon name="Activity" className="w-6 h-6 animate-spin" />
        </div>
        <p className="text-xs font-black text-slate-800 tracking-wider">醫事批價管理系統</p>
        <p className="text-[10px] text-slate-400 mt-1 font-bold">正在讀取最新收費準則資料集...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center font-sans p-6 text-center">
        <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mb-4">
          <DynamicIcon name="ShieldAlert" className="w-6 h-6" />
        </div>
        <h2 className="text-slate-800 font-extrabold text-sm mb-1">查無批價資料庫</h2>
        <p className="text-slate-400 text-xs max-w-sm mb-4 leading-relaxed font-semibold">
          無法載入資料檔案。請嘗試重新整理資料或聯絡技術人員。
        </p>
        <button
          onClick={fetchPricingDetails}
          className="py-2 px-4 bg-rose-600 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-600/10 hover:bg-rose-500 transition-colors"
        >
          重新整理資料
        </button>
      </div>
    );
  }

  return (
    <>
      {viewMode === "patient" ? (
        <PatientPortal
          data={data}
          activeCategory={activeCategory}
          setActiveCategory={setActiveCategory}
          onAdminLoginClick={() => setViewMode("admin")}
          isServerless={isServerless}
        />
      ) : (
        <AdminPortal
          data={data}
          onSaveData={onSaveData}
          onChangePassword={onChangePassword}
          onLogin={onLogin}
          onBackToPortal={() => setViewMode("patient")}
          isServerless={isServerless}
        />
      )}
    </>
  );
}
