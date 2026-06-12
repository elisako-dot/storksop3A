import React, { useState, useEffect } from "react";
import PatientPortal from "./components/PatientPortal";
import AdminPortal from "./components/AdminPortal";
import { PricingDataset } from "./types";
import DynamicIcon from "./components/Icons";

export default function App() {
  const [data, setData] = useState<PricingDataset | null>(null);
  const [activeCategory, setActiveCategory] = useState("registration");
  const [viewMode, setViewMode] = useState<"patient" | "admin">("patient");
  const [isLoading, setIsLoading] = useState(true);

  // Fetch initial pricing details from fullstack Express API
  const fetchPricingDetails = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/pricing-data");
      if (response.ok) {
        const result = await response.json();
        setData(result);
      } else {
        console.error("Failed to fetch pricing data:", response.status);
      }
    } catch (err) {
      console.error("Network error on fetching pricing database:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPricingDetails();
  }, []);

  // Save modified database to fullstack server
  const onSaveData = async (updatedDataset: PricingDataset): Promise<boolean> => {
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
        return true;
      }
    } catch (err) {
      console.error("Error saving updated data:", err);
    }
    return false;
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
      const body = await res.json();
      return body;
    } catch (err) {
      return { success: false, error: "無法連線至伺服器" };
    }
  };

  // Change administrative login password
  const onChangePassword = async (oldPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch("/api/admin/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ oldPassword, newPassword }),
      });
      const body = await res.json();
      return body;
    } catch (err) {
      return { success: false, error: "無法連線至伺服器" };
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
