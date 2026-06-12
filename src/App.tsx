import React, { useState, useEffect } from "react";
import PatientPortal from "./components/PatientPortal";
import AdminPortal from "./components/AdminPortal";
import { PricingDataset } from "./types";
import DynamicIcon from "./components/Icons";
import defaultPricingData from "./data/surgiprice_data.json";

export default function App() {
  const [data, setData] = useState<PricingDataset | null>(null);
  const [activeCategory, setActiveCategory] = useState("registration");
  const [viewMode, setViewMode] = useState<"patient" | "admin">("patient");
  const [isLoading, setIsLoading] = useState(true);

  // Fetch initial pricing details from fullstack Express API or LocalStorage/Import static fallback
  const fetchPricingDetails = async () => {
    setIsLoading(true);
    let success = false;
    try {
      const response = await fetch("/api/pricing-data");
      if (response.ok) {
        const result = await response.json();
        setData(result);
        success = true;
      }
    } catch (err) {
      console.log("Could not fetch remote server API. Using local/static storage fallback instead.");
    }

    if (!success) {
      try {
        const localValue = localStorage.getItem("surgiprice_data");
        if (localValue) {
          setData(JSON.parse(localValue));
        } else {
          setData(defaultPricingData as PricingDataset);
        }
      } catch (err) {
        console.error("Local storage load failed. Using statically imported dataset instead.", err);
        setData(defaultPricingData as PricingDataset);
      }
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchPricingDetails();
  }, []);

  // Save modified database to fullstack server or fallback to localStorage
  const onSaveData = async (updatedDataset: PricingDataset): Promise<boolean> => {
    let savedOnServer = false;
    try {
      const res = await fetch("/api/pricing-data", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedDataset),
      });
      if (res.ok) {
        setData(updatedDataset);
        savedOnServer = true;
      }
    } catch (err) {
      console.warn("Could not save to server API, caching in localStorage:", err);
    }

    try {
      localStorage.setItem("surgiprice_data", JSON.stringify(updatedDataset));
      setData(updatedDataset);
      return true;
    } catch (err) {
      console.error("Failed to store data in local storage:", err);
      return savedOnServer;
    }
  };

  // Log in to administrator backoffice
  const onLogin = async (password: string): Promise<{ success: boolean; token?: string; error?: string }> => {
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        const body = await res.json();
        return body;
      }
    } catch (err) {
      console.warn("Admin login API unavailable, using local authentication fallback:", err);
    }

    const localPassword = localStorage.getItem("admin_password") || "admin";
    if (password === localPassword) {
      return { success: true, token: "local-static-token" };
    } else {
      return { success: false, error: "密碼錯誤" };
    }
  };

  // Change administrative login password
  const onChangePassword = async (oldPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> => {
    let changedOnServer = false;
    try {
      const res = await fetch("/api/admin/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ oldPassword, newPassword }),
      });
      if (res.ok) {
        const body = await res.json();
        if (body.success) {
          changedOnServer = true;
        } else {
          return body;
        }
      }
    } catch (err) {
      console.warn("Could not modify server password, fallback to local storage password instead:", err);
    }

    const localPassword = localStorage.getItem("admin_password") || "admin";
    if (oldPassword === localPassword) {
      localStorage.setItem("admin_password", newPassword);
      return { success: true };
    } else {
      return { success: false, error: "舊密碼錯誤" };
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center font-sans">
        <div className="w-12 h-12 bg-rose-500 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-rose-100 animate-bounce mb-4">
          <DynamicIcon name="Activity" className="w-6 h-6 animate-spin" />
        </div>
        <p className="text-xs font-black text-slate-800 tracking-wider">醫事批價管理系統</p>
        <p className="text-[10px] text-slate-400 mt-1 font-bold">正在讀取最新的送子鳥收費準則資料集...</p>
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
          伺服器上未找到 surgiprice_data.json，可能是資料擷取腳本仍在開機提取中。
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
        />
      ) : (
        <AdminPortal
          data={data}
          onSaveData={onSaveData}
          onChangePassword={onChangePassword}
          onLogin={onLogin}
          onBackToPortal={() => setViewMode("patient")}
        />
      )}
    </>
  );
}
