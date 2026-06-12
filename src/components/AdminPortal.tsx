import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import DynamicIcon from "./Icons";
import { PricingDataset, CategoryData, Section, TableSection, NotesSection, CategoryInfo } from "../types";

interface AdminPortalProps {
  data: PricingDataset;
  onSaveData: (updatedDataset: PricingDataset) => Promise<boolean>;
  onChangePassword: (oldPw: string, newPw: string) => Promise<{ success: boolean; error?: string }>;
  onLogin: (password: string) => Promise<{ success: boolean; token?: string; error?: string }>;
  onBackToPortal: () => void;
}

export default function AdminPortal({
  data,
  onSaveData,
  onChangePassword,
  onLogin,
  onBackToPortal,
}: AdminPortalProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loading, setLoading] = useState(false);

  // Editor States
  const [localData, setLocalData] = useState<PricingDataset | null>(null);
  const [activeCategory, setActiveCategory] = useState("registration");
  const [searchQuery, setSearchQuery] = useState("");
  const [unsavedChanges, setUnsavedChanges] = useState(false);

  // Settings / Modal States
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState("");

  // Custom Confirmation Modal & Toast state
  const [confirmModal, setConfirmModal] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error" | "info";
  } | null>(null);

  const showToast = (message: string, type: "success" | "error" | "info" = "info") => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    // Clone remote data locally for isolated editing
    if (data) {
      setLocalData(JSON.parse(JSON.stringify(data)));
    }
  }, [data]);

  useEffect(() => {
    setSearchQuery("");
  }, [activeCategory]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setLoading(true);
    const res = await onLogin(password);
    setLoading(false);
    if (res.success) {
      setIsAuthenticated(true);
    } else {
      setLoginError(res.error || "密碼錯誤");
    }
  };

  const handleSaveAll = async () => {
    if (!localData) return;
    setLoading(true);
    const success = await onSaveData(localData);
    setLoading(false);
    if (success) {
      setUnsavedChanges(false);
      showToast("儲存成功！", "success");
    } else {
      showToast("儲存失敗，請重試", "error");
    }
  };

  // Change Password Prompt
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError("");
    setPwSuccess("");
    if (!newPw.trim()) {
      setPwError("新密碼不能為空");
      return;
    }
    const res = await onChangePassword(oldPw, newPw);
    if (res.success) {
      setPwSuccess("密碼修改成功！");
      setOldPw("");
      setNewPw("");
      setTimeout(() => setShowPasswordModal(false), 1500);
    } else {
      setPwError(res.error || "無法修改密碼");
    }
  };

  // Backup Data - Export
  const handleExportBackup = () => {
    if (!localData) return;
    const jsonStr = JSON.stringify(localData, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `surgiprice_data_backup_${new Date().toISOString().split("T")[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Backup Data - Import
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        if (imported.categoriesData && imported.categoriesList && imported.groupsList) {
          setLocalData(imported);
          setUnsavedChanges(true);
          showToast("備份檔載入成功！請點擊右上方「儲存變更」更新伺服器資料。", "success");
        } else {
          showToast("錯誤的檔案格式：缺少必要屬性。", "error");
        }
      } catch (err) {
        showToast("JSON 檔案解析失敗，請確認檔案格式完整。", "error");
      }
    };
    reader.readAsText(file);
  };

  // -----------------------------------------------------
  // Data Editing Utilities
  // -----------------------------------------------------
  const updateActiveCategoryHeaderField = (field: "title" | "updated", val: string) => {
    if (!localData) return;
    const cloned = { ...localData };
    if (!cloned.categoriesData[activeCategory]) return;
    cloned.categoriesData[activeCategory][field] = val;
    setLocalData(cloned);
    setUnsavedChanges(true);
  };

  // Section level updates
  const addSection = (type: "table" | "notes") => {
    if (!localData) return;
    const cloned = { ...localData };
    const sections = cloned.categoriesData[activeCategory]?.sections || [];
    
    if (type === "table") {
      sections.push({
        name: "新增收費小組",
        headers: ["細項名稱", "原價", "優惠價", "備註"],
        rows: [["範例項目", "1,000", "800", "測試說明"]]
      });
    } else {
      sections.push({
        name: "新增注意事項",
        type: "notes",
        items: ["範例注意點一", "範例注意點二"]
      });
    }
    
    cloned.categoriesData[activeCategory].sections = sections;
    setLocalData(cloned);
    setUnsavedChanges(true);
  };

  const deleteSection = (idx: number) => {
    setConfirmModal({
      title: "確定刪除大分區？",
      message: "確定要刪除整個大分區（及其所有資料行）嗎？此動作無法復原。",
      onConfirm: () => {
        const cloned = { ...localData! };
        cloned.categoriesData[activeCategory].sections.splice(idx, 1);
        setLocalData(cloned);
        setUnsavedChanges(true);
        setConfirmModal(null);
        showToast("分區已成功刪除", "info");
      }
    });
  };

  const moveSection = (idx: number, direction: "up" | "down") => {
    if (!localData) return;
    const cloned = { ...localData };
    const sections = cloned.categoriesData[activeCategory].sections;
    if (direction === "up" && idx > 0) {
      [sections[idx], sections[idx - 1]] = [sections[idx - 1], sections[idx]];
    } else if (direction === "down" && idx < sections.length - 1) {
      [sections[idx], sections[idx + 1]] = [sections[idx + 1], sections[idx]];
    }
    setLocalData(cloned);
    setUnsavedChanges(true);
  };

  // Row / note updates inside sections
  const updateSectionName = (secIdx: number, newName: string) => {
    if (!localData) return;
    const cloned = { ...localData };
    cloned.categoriesData[activeCategory].sections[secIdx].name = newName;
    setLocalData(cloned);
    setUnsavedChanges(true);
  };

  const updateTableHeaders = (secIdx: number, headerIdx: number, val: string) => {
    if (!localData) return;
    const cloned = { ...localData };
    const sec = cloned.categoriesData[activeCategory].sections[secIdx] as TableSection;
    if (sec.headers) {
      sec.headers[headerIdx] = val;
      setLocalData(cloned);
      setUnsavedChanges(true);
    }
  };

  const addHeaderField = (secIdx: number) => {
    if (!localData) return;
    const cloned = { ...localData };
    const sec = cloned.categoriesData[activeCategory].sections[secIdx] as TableSection;
    sec.headers.push("新欄位");
    sec.rows = sec.rows.map(row => [...row, ""]);
    setLocalData(cloned);
    setUnsavedChanges(true);
  };

  const deleteHeaderField = (secIdx: number, headerIdx: number) => {
    setConfirmModal({
      title: "確定刪除此資料欄位？",
      message: "刪除欄位會一併移除該直行所有的資料，確定進行嗎？",
      onConfirm: () => {
        const cloned = { ...localData! };
        const sec = cloned.categoriesData[activeCategory].sections[secIdx] as TableSection;
        sec.headers.splice(headerIdx, 1);
        sec.rows = sec.rows.map(row => {
          const copy = [...row];
          copy.splice(headerIdx, 1);
          return copy;
        });
        setLocalData(cloned);
        setUnsavedChanges(true);
        setConfirmModal(null);
        showToast("欄位已成功刪除", "info");
      }
    });
  };

  const updateTableRowCell = (secIdx: number, rowIdx: number, colIdx: number, val: string) => {
    if (!localData) return;
    const cloned = { ...localData };
    const sec = cloned.categoriesData[activeCategory].sections[secIdx] as TableSection;
    if (sec.rows && sec.rows[rowIdx]) {
      sec.rows[rowIdx][colIdx] = val;
      setLocalData(cloned);
      setUnsavedChanges(true);
    }
  };

  const addTableRow = (secIdx: number) => {
    if (!localData) return;
    const cloned = { ...localData };
    const sec = cloned.categoriesData[activeCategory].sections[secIdx] as TableSection;
    const emptyRow = Array(sec.headers.length).fill("");
    sec.rows.push(emptyRow);
    setLocalData(cloned);
    setUnsavedChanges(true);
  };

  const deleteTableRow = (secIdx: number, rowIdx: number) => {
    if (!localData) return;
    const cloned = { ...localData };
    const sec = cloned.categoriesData[activeCategory].sections[secIdx] as TableSection;
    sec.rows.splice(rowIdx, 1);
    setLocalData(cloned);
    setUnsavedChanges(true);
  };

  const moveTableRow = (secIdx: number, rowIdx: number, direction: "up" | "down") => {
    if (!localData) return;
    const cloned = { ...localData };
    const sec = cloned.categoriesData[activeCategory].sections[secIdx] as TableSection;
    if (direction === "up" && rowIdx > 0) {
      [sec.rows[rowIdx], sec.rows[rowIdx - 1]] = [sec.rows[rowIdx - 1], sec.rows[rowIdx]];
    } else if (direction === "down" && rowIdx < sec.rows.length - 1) {
      [sec.rows[rowIdx], sec.rows[rowIdx + 1]] = [sec.rows[rowIdx + 1], sec.rows[rowIdx]];
    }
    setLocalData(cloned);
    setUnsavedChanges(true);
  };

  // Bullet Notes editing helper
  const updateNoteItem = (secIdx: number, noteIdx: number, val: string) => {
    if (!localData) return;
    const cloned = { ...localData };
    const sec = cloned.categoriesData[activeCategory].sections[secIdx] as NotesSection;
    if (sec.items && sec.items[noteIdx] !== undefined) {
      sec.items[noteIdx] = val;
      setLocalData(cloned);
      setUnsavedChanges(true);
    }
  };

  const addNoteItem = (secIdx: number) => {
    if (!localData) return;
    const cloned = { ...localData };
    const sec = cloned.categoriesData[activeCategory].sections[secIdx] as NotesSection;
    sec.items.push("");
    setLocalData(cloned);
    setUnsavedChanges(true);
  };

  const deleteNoteItem = (secIdx: number, noteIdx: number) => {
    if (!localData) return;
    const cloned = { ...localData };
    const sec = cloned.categoriesData[activeCategory].sections[secIdx] as NotesSection;
    sec.items.splice(noteIdx, 1);
    setLocalData(cloned);
    setUnsavedChanges(true);
  };

  const moveNoteItem = (secIdx: number, noteIdx: number, direction: "up" | "down") => {
    if (!localData) return;
    const cloned = { ...localData };
    const sec = cloned.categoriesData[activeCategory].sections[secIdx] as NotesSection;
    if (direction === "up" && noteIdx > 0) {
      [sec.items[noteIdx], sec.items[noteIdx - 1]] = [sec.items[noteIdx - 1], sec.items[noteIdx]];
    } else if (direction === "down" && noteIdx < sec.items.length - 1) {
      [sec.items[noteIdx], sec.items[noteIdx + 1]] = [sec.items[noteIdx + 1], sec.items[noteIdx]];
    }
    setLocalData(cloned);
    setUnsavedChanges(true);
  };

  // -----------------------------------------------------
  // Security Prompt Gate (Before rendering Admin Interface)
  // -----------------------------------------------------
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-950 p-4 font-sans text-white">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-slate-900 border border-slate-800 w-full max-w-md p-8 rounded-3xl shadow-2xl relative overflow-hidden"
        >
          {/* Subtle decoration dots */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="text-center mb-8">
            <div className="w-12 h-12 bg-rose-500 text-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-rose-500/20">
              <DynamicIcon name="Lock" className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-extrabold tracking-tight">送子鳥批價管理系統</h1>
            <p className="text-xs text-slate-400 mt-1.5 font-medium">請輸入後台登入密碼以進行修改</p>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-350 uppercase mb-1.5 tracking-wider">登入密碼</label>
              <input
                type="password"
                placeholder="密碼 (預設為 admin)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-11 px-4 bg-slate-950 border border-slate-800 focus:border-rose-500 rounded-xl outline-none text-sm transition-all focus:ring-1 focus:ring-rose-500/30"
                required
              />
            </div>

            {loginError && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-xs font-semibold text-rose-450 bg-rose-500/10 py-2.5 px-3 rounded-xl border border-rose-500/20 flex items-center gap-1.5"
              >
                <DynamicIcon name="ShieldAlert" className="w-4 h-4" />
                {loginError}
              </motion.p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-extrabold rounded-xl transition-colors text-xs tracking-wider uppercase shadow-lg shadow-rose-600/10 mt-2"
            >
              {loading ? "正在驗證中..." : "驗證登入"}
            </button>
          </form>

          <button
            onClick={onBackToPortal}
            className="w-full h-10 border border-slate-800 hover:bg-slate-800/40 text-slate-300 font-bold rounded-xl transition-all text-xs tracking-wider mt-3"
          >
            返回查詢前台
          </button>
        </motion.div>
      </div>
    );
  }

  // -----------------------------------------------------
  // Authenticated Admin Dashboard View
  // -----------------------------------------------------
  if (!localData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 font-semibold text-slate-500">
        載入後台資料中...
      </div>
    );
  }

  const { categoriesData, categoriesList } = localData;
  const activeCategoryData = categoriesData[activeCategory] || { title: "", updated: "", sections: [] };

  return (
    <div className="flex flex-col h-screen bg-slate-50 overflow-hidden font-sans text-slate-800 antialiased">
      
      {/* 1. Header Toolbar */}
      <header className="bg-slate-900 border-b border-slate-800 text-white min-h-16 px-6 py-3 flex-shrink-0 flex flex-col md:flex-row items-center justify-between gap-3 shadow-md z-40">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-rose-600 rounded-xl flex items-center justify-center shadow-lg shadow-rose-600/20">
            <DynamicIcon name="Edit" className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-extrabold tracking-tight flex items-center gap-2">
              送子鳥批價管理後台
              {unsavedChanges && (
                <span className="bg-amber-500/20 text-amber-300 font-bold text-[9px] px-1.5 py-0.5 rounded-full border border-amber-500/30 animate-pulse">
                  有未儲存的變更
                </span>
              )}
            </h1>
            <p className="text-[10px] text-slate-400 font-medium">您可以點按儲存以永久保存修訂的臨床表格</p>
          </div>
        </div>

        {/* Global Toolbar buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Export / Backups */}
          <div className="flex items-center bg-slate-800 rounded-xl border border-slate-700/60 p-0.5 shadow-inner">
            <button
              onClick={handleExportBackup}
              title="匯出備份 (Export)"
              className="py-1.5 px-3 bg-transparent hover:bg-slate-700 text-slate-350 hover:text-white rounded-lg text-[10px] font-bold flex items-center gap-1.5 transition-all"
            >
              <DynamicIcon name="Download" className="w-3.5 h-3.5" />
              <span>匯出備份</span>
            </button>
            <label className="py-1.5 px-3 bg-transparent hover:bg-slate-700 text-slate-350 hover:text-white rounded-lg text-[10px] font-bold flex items-center gap-1.5 transition-all cursor-pointer">
              <DynamicIcon name="Upload" className="w-3.5 h-3.5" />
              <span>匯入備份</span>
              <input type="file" accept=".json" onChange={handleImportBackup} className="hidden" />
            </label>
          </div>

          {/* Change Password */}
          <button
            onClick={() => setShowPasswordModal(true)}
            className="py-1.5 px-3 bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300 hover:text-white transition-all rounded-xl text-[10px] font-bold flex items-center gap-1"
          >
            <DynamicIcon name="Lock" className="w-3.5 h-3.5" />
            <span>變更密碼</span>
          </button>

          {/* Back to Home */}
          <button
            onClick={() => {
              if (unsavedChanges) {
                setConfirmModal({
                  title: "確認放棄變更？",
                  message: "尚有未儲存的修訂，確認離開管理後台並放棄所有修改嗎？",
                  onConfirm: () => {
                    setConfirmModal(null);
                    onBackToPortal();
                  },
                });
              } else {
                onBackToPortal();
              }
            }}
            className="py-1.5 px-3 bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300 hover:text-white transition-all rounded-xl text-[10px] font-bold flex items-center gap-1"
          >
            <DynamicIcon name="Home" className="w-3.5 h-3.5" />
            <span>返回前台</span>
          </button>

          {/* Save All (Critical button) */}
          <button
            onClick={handleSaveAll}
            disabled={loading}
            className="py-1.5 px-4 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white transition-all rounded-xl text-[10px] font-extrabold flex items-center gap-1 shadow-lg shadow-teal-700/10"
          >
            <DynamicIcon name="Save" className="w-3.5 h-3.5" />
            <span>儲存變更</span>
          </button>
        </div>
      </header>

      {/* 2. Workspace Panel Grid */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        
        {/* Sidebar Nav categories selection */}
        <aside className="w-full md:w-56 flex-shrink-0 bg-white border-r border-slate-200 overflow-y-auto py-3 px-3 flex flex-row md:flex-col gap-1 md:space-y-0.5 border-b md:border-b-0">
          {categoriesList.map((cat) => {
            const isActive = activeCategory === cat.key;
            return (
              <button
                key={cat.key}
                onClick={() => setActiveCategory(cat.key)}
                className={`flex-shrink-0 md:w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-all text-xs font-semibold ${
                  isActive ? "bg-rose-50 text-rose-700 font-extrabold shadow-sm" : "text-slate-500 hover:bg-slate-50"
                }`}
              >
                <DynamicIcon name={cat.icon} className={`w-4 h-4 ${isActive ? "text-rose-600" : "text-slate-400"}`} />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </aside>

        {/* Categories form workspace */}
        <main className="flex-1 overflow-y-auto p-6 max-w-5xl">
          
          {/* Header parameters */}
          <section className="bg-white border border-slate-200/60 rounded-2xl p-5 mb-6 shadow-sm flex flex-col md:flex-row items-end gap-4 justify-between">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
              <div>
                <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
                  分區主題名稱 (Category Title)
                </label>
                <input
                  type="text"
                  value={activeCategoryData.title}
                  onChange={(e) => updateActiveCategoryHeaderField("title", e.target.value)}
                  className="w-full h-10 px-3 border border-slate-200 focus:border-rose-400 focus:ring-1 focus:ring-rose-100 outline-none rounded-xl text-xs font-bold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
                  最後更新日期 (Last Updated)
                </label>
                <input
                  type="text"
                  placeholder="YYYY/MM/DD 或 尚無"
                  value={activeCategoryData.updated || ""}
                  onChange={(e) => updateActiveCategoryHeaderField("updated", e.target.value)}
                  className="w-full h-10 px-3 border border-slate-200 focus:border-rose-400 focus:ring-1 focus:ring-rose-100 outline-none rounded-xl text-xs font-mono font-bold"
                />
              </div>
            </div>
            
            {/* Quick add elements action panel */}
            <div className="flex-shrink-0 flex gap-2">
              <button
                onClick={() => addSection("table")}
                className="py-2.5 px-3.5 border border-slate-200 bg-white hover:bg-slate-50 hover:text-rose-600 transition-all rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
              >
                <DynamicIcon name="Plus" className="w-3.5 h-3.5 text-rose-500" />
                新增表格
              </button>
              <button
                onClick={() => addSection("notes")}
                className="py-2.5 px-3.5 border border-slate-200 bg-white hover:bg-slate-50 hover:text-indigo-650 transition-all rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
              >
                <DynamicIcon name="Plus" className="w-3.5 h-3.5 text-indigo-500" />
                新增說明
              </button>
            </div>
          </section>

          {/* 後台內部即時搜尋功能 */}
          <section className="bg-white border border-slate-200/60 rounded-2xl p-4 mb-6 shadow-sm">
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <DynamicIcon name="Search" className="w-4 h-4 text-slate-400" />
              </span>
              <input
                type="text"
                placeholder="在目前大分區內搜尋... (可搜尋：表格名稱、欄位名稱、手術/處置代碼、項目名稱、點數、備註說明)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-11 pl-10 pr-10 border border-slate-200 focus:border-rose-400 focus:ring-1 focus:ring-rose-100 outline-none rounded-xl text-xs font-semibold text-slate-700 bg-slate-50/20 placeholder-slate-400 transition-all shadow-inner"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-650 transition-colors"
                  title="清除搜尋"
                >
                  <DynamicIcon name="X" className="w-4 h-4" />
                </button>
              )}
            </div>
          </section>

          {searchQuery && (
            <div className="mb-4 bg-rose-50/50 border border-rose-100 rounded-xl p-3 flex justify-between items-center text-xs text-rose-800">
              <div className="flex items-center gap-1.5 font-semibold">
                <DynamicIcon name="Activity" className="w-4 h-4 text-rose-500 animate-pulse" />
                <span>
                  已篩選關鍵字：<strong className="text-rose-650 font-extrabold">「 {searchQuery} 」</strong>
                </span>
              </div>
              <button
                onClick={() => setSearchQuery("")}
                className="text-[10px] py-1 px-2.5 bg-white hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-lg transition-colors font-bold shadow-sm"
              >
                清除篩選並顯示全部
              </button>
            </div>
          )}

          {/* Section Editors Map */}
          <div className="space-y-6">
            {activeCategoryData.sections.length === 0 ? (
              <div className="py-20 bg-white border border-dashed border-slate-200 rounded-2xl text-center text-slate-400 text-xs">
                <DynamicIcon name="Plus" className="w-10 h-10 mx-auto mb-2 opacity-30 text-rose-500" />
                <p className="font-extrabold text-slate-700">目前沒有任何內容區間</p>
                <p className="text-[10px] mt-1 text-slate-400">請按上方「新增表格」或「新增說明」開始編撰</p>
              </div>
            ) : (() => {
              const query = searchQuery.trim().toLowerCase();
              const filteredSections = activeCategoryData.sections
                .map((section, idx) => ({ section, idx }))
                .filter(({ section }) => {
                  if (!query) return true;
                  if (section.name?.toLowerCase().includes(query)) return true;
                  
                  const isTbl = !section.type || section.type === "table";
                  if (isTbl) {
                    const s = section as TableSection;
                    if (s.headers?.some(h => h.toLowerCase().includes(query))) return true;
                    if (s.rows?.some(r => r.some(cell => cell.toLowerCase().includes(query)))) return true;
                  } else {
                    const s = section as NotesSection;
                    if (s.items?.some(i => i.toLowerCase().includes(query))) return true;
                  }
                  return false;
                });

              if (filteredSections.length === 0) {
                return (
                  <div className="py-20 bg-white border border-slate-200 rounded-2xl text-center text-slate-400 text-xs">
                    <DynamicIcon name="Search" className="w-10 h-10 mx-auto mb-2 opacity-20 text-slate-400" />
                    <p className="font-extrabold text-slate-700">未找到與「{searchQuery}」相關的項目</p>
                    <p className="text-[10px] mt-1 text-slate-400">請嘗試更換其他關鍵字，或清除篩選以檢視全部項目</p>
                  </div>
                );
              }

              return filteredSections.map(({ section, idx: secIdx }) => {
                const isTable = !section.type || section.type === "table";
                return (
                  <div
                    key={secIdx}
                    className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden"
                  >
                    {/* Section Editor Title Toolbar */}
                    <div className="bg-slate-50/60 px-5 py-3.5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div className="flex-1 flex items-center gap-2">
                        <span className="text-slate-400 text-[10px] font-mono font-bold">#{secIdx + 1}</span>
                        <input
                          type="text"
                          value={section.name}
                          onChange={(e) => updateSectionName(secIdx, e.target.value)}
                          className="font-extrabold text-xs text-slate-800 border-b border-dashed border-transparent hover:border-slate-350 focus:border-rose-500 focus:bg-white bg-transparent outline-none px-1.5 py-0.5 flex-1 max-w-sm transition-colors"
                          placeholder="分區標題"
                        />
                      </div>
                      
                      {/* Control buttons */}
                      <div className="flex items-center gap-1.5 self-end sm:self-auto">
                        <button
                          onClick={() => moveSection(secIdx, "up")}
                          disabled={secIdx === 0 || !!query}
                          className="p-1 border border-slate-150 hover:bg-slate-100 rounded-lg text-slate-550 disabled:opacity-40 transition-colors"
                          title={query ? "搜尋時停用大分區移動" : "移上"}
                        >
                          <DynamicIcon name="ArrowUp" className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => moveSection(secIdx, "down")}
                          disabled={secIdx === activeCategoryData.sections.length - 1 || !!query}
                          className="p-1 border border-slate-150 hover:bg-slate-100 rounded-lg text-slate-550 disabled:opacity-40 transition-colors"
                          title={query ? "搜尋時停用大分區移動" : "移下"}
                        >
                          <DynamicIcon name="ArrowDown" className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => deleteSection(secIdx)}
                          className="p-1 border border-rose-100 bg-rose-50 hover:bg-rose-100 rounded-lg text-rose-600 transition-colors ml-1"
                          title="刪除大分區"
                        >
                          <DynamicIcon name="Trash2" className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Editor Fields rendering */}
                    <div className="p-4 overflow-hidden">
                      {isTable ? (
                        <div className="space-y-4">
                          
                          {/* 1. Header Column Editors */}
                          <div>
                            <div className="flex items-center justify-between mb-1.5 px-1">
                              <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                                橫直行表格欄位 (Table Headers)
                              </label>
                              <button
                                onClick={() => addHeaderField(secIdx)}
                                className="text-[10px] font-extrabold text-rose-600 hover:text-rose-500 hover:underline flex items-center gap-0.5"
                              >
                                <DynamicIcon name="Plus" className="w-2.5 h-2.5" />
                                增加直欄 (Add Column)
                              </button>
                            </div>
                            
                            <div className="flex flex-wrap gap-2.5 bg-slate-50/50 p-2.5 sm:p-3 rounded-xl border border-slate-100">
                              {(section as TableSection).headers?.map((header, headIdx) => (
                                <div
                                  key={headIdx}
                                  className="flex items-center bg-white border border-slate-200 rounded-xl px-2.5 py-1 text-slate-650"
                                >
                                  <input
                                    type="text"
                                    value={header}
                                    onChange={(e) => updateTableHeaders(secIdx, headIdx, e.target.value)}
                                    className="text-xs font-bold text-slate-700 outline-none bg-transparent w-20 sm:w-24 focus:ring-1 focus:ring-rose-300"
                                  />
                                  <button
                                    onClick={() => deleteHeaderField(secIdx, headIdx)}
                                    disabled={(section as TableSection).headers.length <= 1}
                                    className="p-1 text-slate-350 hover:text-rose-600 disabled:opacity-20 flex-shrink-0 transition-colors"
                                    title="刪除此欄"
                                  >
                                    <DynamicIcon name="X" className="w-3 h-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* 2. Cells & Rows Editors Grid */}
                          <div>
                            <div className="flex items-center justify-between mb-1.5 px-1">
                              <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                                資料欄內容 (Table Rows)
                              </label>
                              <button
                                onClick={() => addTableRow(secIdx)}
                                className="text-[10px] font-extrabold text-teal-650 hover:text-teal-550 hover:underline flex items-center gap-0.5"
                              >
                                <DynamicIcon name="Plus" className="w-2.5 h-2.5" />
                                增加資料行 (Add Row)
                              </button>
                            </div>

                            <div className="space-y-4 max-h-96 overflow-y-auto border border-slate-100 rounded-xl p-2 bg-slate-50/20">
                              {(() => {
                                const rowsWithIndices = (section as TableSection).rows?.map((row, rIdx) => ({ row, rIdx })) || [];
                                const filteredRows = query
                                  ? rowsWithIndices.filter(({ row }) => row.some(cell => cell.toLowerCase().includes(query)))
                                  : rowsWithIndices;

                                if (filteredRows.length === 0 && (section as TableSection).rows?.length > 0) {
                                  return (
                                    <div className="text-center py-6 text-[10px] text-slate-400">
                                      此表格內無符合關鍵字「{searchQuery}」的資料行
                                    </div>
                                  );
                                }

                                return filteredRows.map(({ row, rIdx: rowIdx }) => (
                                  <div
                                    key={rowIdx}
                                    className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-white p-3 rounded-xl border border-slate-150 relative shadow-sm group"
                                  >
                                    {/* Row serial indicators */}
                                    <div className="text-[10px] font-mono font-bold text-slate-350 select-none px-1 flex sm:flex-col items-center justify-between sm:justify-start gap-1">
                                      <span>#{rowIdx + 1}</span>
                                      <div className="flex gap-1">
                                        <button
                                          onClick={() => moveTableRow(secIdx, rowIdx, "up")}
                                          disabled={rowIdx === 0 || !!query}
                                          className="p-0.5 border border-slate-150 hover:bg-slate-100 rounded text-slate-400 disabled:opacity-20"
                                          title={query ? "搜尋時停用移動" : "移上"}
                                        >
                                          <DynamicIcon name="ChevronUp" className="w-2.5 h-2.5" />
                                        </button>
                                        <button
                                          onClick={() => moveTableRow(secIdx, rowIdx, "down")}
                                          disabled={rowIdx === (section as TableSection).rows.length - 1 || !!query}
                                          className="p-0.5 border border-slate-150 hover:bg-slate-100 rounded text-slate-400 disabled:opacity-20"
                                          title={query ? "搜尋時停用移動" : "移下"}
                                        >
                                          <DynamicIcon name="ChevronDown" className="w-2.5 h-2.5" />
                                        </button>
                                      </div>
                                    </div>

                                    {/* Row Inputs Cells */}
                                    <div className="flex-1 grid gap-2.5" style={{ gridTemplateColumns: `repeat(${(section as TableSection).headers.length}, minmax(100px, 1fr))` }}>
                                      {row.map((cell, colIdx) => (
                                        <textarea
                                          key={colIdx}
                                          rows={1}
                                          value={cell}
                                          onChange={(e) => updateTableRowCell(secIdx, rowIdx, colIdx, e.target.value)}
                                          className="w-full text-xs font-semibold p-1.5 border border-slate-200 focus:border-rose-400 focus:ring-1 focus:ring-rose-200 outline-none rounded-lg text-slate-700 bg-white resize-y font-mono"
                                          placeholder={(section as TableSection).headers[colIdx]}
                                        />
                                      ))}
                                    </div>

                                    {/* Remove row button */}
                                    <button
                                      onClick={() => deleteTableRow(secIdx, rowIdx)}
                                      className="p-1 text-slate-350 hover:text-rose-600 transition-colors self-end sm:self-auto"
                                      title="刪除此行"
                                    >
                                      <DynamicIcon name="Trash2" className="w-4 h-4" />
                                    </button>
                                  </div>
                                ));
                              })()}

                              {(section as TableSection).rows?.length === 0 && (
                                <div className="text-center py-6 text-[10px] text-slate-400">
                                  無資料，請點點右上方「增加資料行」填寫
                                </div>
                              )}
                            </div>
                          </div>

                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between px-1">
                            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                              列點說明項目列表 (Bullet Points List)
                            </label>
                            <button
                              onClick={() => addNoteItem(secIdx)}
                              className="text-[10px] font-extrabold text-indigo-650 hover:text-indigo-550 hover:underline flex items-center gap-0.5"
                            >
                              <DynamicIcon name="Plus" className="w-2.5 h-2.5" />
                              增加列點 (Add Bullet)
                            </button>
                          </div>

                          <div className="space-y-2 max-h-96 overflow-y-auto p-2 border border-slate-150/80 rounded-xl bg-slate-50/20">
                            {(() => {
                              const noteItemsWithIndices = (section as NotesSection).items?.map((item, iIdx) => ({ item, iIdx })) || [];
                              const filteredNoteItems = query
                                ? noteItemsWithIndices.filter(({ item }) => item.toLowerCase().includes(query))
                                : noteItemsWithIndices;

                              if (filteredNoteItems.length === 0 && (section as NotesSection).items?.length > 0) {
                                return (
                                  <div className="text-center py-6 text-xs text-slate-400">
                                    此說明的項目中，無符合搜尋關鍵字的列表內容
                                  </div>
                                );
                              }

                              return filteredNoteItems.map(({ item, iIdx: itemIdx }) => (
                                <div
                                  key={itemIdx}
                                  className="flex items-start gap-2.5 bg-white p-2.5 rounded-xl border border-slate-150 shadow-sm"
                                >
                                  {/* Numbers or indicators */}
                                  <div className="text-[10px] font-mono font-bold text-slate-350 select-none pt-2 flex flex-col items-center gap-1">
                                    <span>#{itemIdx + 1}</span>
                                    <div className="flex gap-0.5">
                                      <button
                                        onClick={() => moveNoteItem(secIdx, itemIdx, "up")}
                                        disabled={itemIdx === 0 || !!query}
                                        className="p-0.5 border border-slate-150 hover:bg-slate-100 rounded text-slate-400 disabled:opacity-20"
                                        title={query ? "搜尋時停用移動" : "移上"}
                                      >
                                        <DynamicIcon name="ChevronUp" className="w-2 h-2" />
                                      </button>
                                      <button
                                        onClick={() => moveNoteItem(secIdx, itemIdx, "down")}
                                        disabled={itemIdx === (section as NotesSection).items.length - 1 || !!query}
                                        className="p-0.5 border border-slate-150 hover:bg-slate-100 rounded text-slate-400 disabled:opacity-20"
                                        title={query ? "搜尋時停用移動" : "移下"}
                                      >
                                        <DynamicIcon name="ChevronDown" className="w-2 h-2" />
                                      </button>
                                    </div>
                                  </div>

                                  <textarea
                                    rows={2}
                                    value={item}
                                    onChange={(e) => updateNoteItem(secIdx, itemIdx, e.target.value)}
                                    className="flex-1 w-full text-xs font-semibold p-2 border border-slate-200 focus:border-rose-400 focus:ring-1 focus:ring-rose-200 rounded-lg text-slate-700 bg-white font-mono"
                                    placeholder="條款/說明內容..."
                                  />

                                  <button
                                    onClick={() => deleteNoteItem(secIdx, itemIdx)}
                                    className="p-1 text-slate-350 hover:text-rose-600 transition-colors pt-2.5"
                                    title="移除此條"
                                  >
                                    <DynamicIcon name="Trash2" className="w-4 h-4" />
                                  </button>
                                </div>
                              ));
                            })()}

                            {(section as NotesSection).items?.length === 0 && (
                              <div className="text-center py-6 text-xs text-slate-400">
                                無批註項目，請點上方「增加列點」建立
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                  </div>
                );
              });
            })()}
          </div>

        </main>
      </div>

      {/* 3. Change password Modal element */}
      <AnimatePresence>
        {showPasswordModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 text-white">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 w-full max-w-sm p-6 rounded-2xl shadow-xl relative"
            >
              <button
                onClick={() => setShowPasswordModal(false)}
                className="absolute right-4 top-4 text-slate-400 hover:text-white"
              >
                <DynamicIcon name="X" className="w-4 h-4" />
              </button>

              <h3 className="text-sm font-extrabold tracking-tight mb-4 flex items-center gap-1.5 border-b border-slate-800 pb-3">
                <DynamicIcon name="Lock" className="w-4 h-4 text-rose-500" />
                變更管理登入密碼
              </h3>

              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1 tracking-wider uppercase">舊密碼</label>
                  <input
                    type="password"
                    placeholder="請輸入現行密碼..."
                    value={oldPw}
                    onChange={(e) => setOldPw(e.target.value)}
                    className="w-full h-10 px-3.5 bg-slate-950 border border-slate-800 focus:border-rose-500 rounded-xl outline-none text-xs transition-colors"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1 tracking-wider uppercase">新密碼</label>
                  <input
                    type="password"
                    placeholder="請輸入欲變更之新密碼..."
                    value={newPw}
                    onChange={(e) => setNewPw(e.target.value)}
                    className="w-full h-10 px-3.5 bg-slate-950 border border-slate-800 focus:border-rose-500 rounded-xl outline-none text-xs transition-colors"
                    required
                  />
                </div>

                {pwError && (
                  <p className="text-[11px] text-rose-450 bg-rose-500/10 p-2 border border-rose-500/20 rounded-xl font-semibold flex items-center gap-1">
                    <DynamicIcon name="ShieldAlert" className="w-3.5 h-3.5" />
                    {pwError}
                  </p>
                )}

                {pwSuccess && (
                  <p className="text-[11px] text-teal-450 bg-teal-500/10 p-2 border border-teal-500/20 rounded-xl font-semibold flex items-center gap-1">
                    <DynamicIcon name="Check" className="w-3.5 h-3.5" />
                    {pwSuccess}
                  </p>
                )}

                <button
                  type="submit"
                  className="w-full h-10 bg-rose-600 hover:bg-rose-500 text-white font-extrabold rounded-xl transition-all text-xs tracking-wider uppercase"
                >
                  確認修改密碼
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 4. Custom Confirmation Modal */}
      <AnimatePresence>
        {confirmModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-slate-200 w-full max-w-sm rounded-2xl shadow-xl overflow-hidden text-slate-800"
            >
              <div className="p-5 border-b border-slate-100 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-rose-55 flex items-center justify-center text-rose-600">
                  <DynamicIcon name="ShieldAlert" className="w-4 h-4" />
                </div>
                <h4 className="text-sm font-extrabold text-slate-850">{confirmModal.title}</h4>
              </div>
              
              <div className="p-5">
                <p className="text-xs text-slate-550 font-medium leading-relaxed">
                  {confirmModal.message}
                </p>
              </div>

              <div className="bg-slate-50 px-5 py-3.5 flex items-center justify-end gap-2 text-xs">
                <button
                  onClick={() => setConfirmModal(null)}
                  className="px-3.5 py-2 border border-slate-200 bg-white hover:bg-slate-100 text-slate-550 font-bold rounded-xl transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={confirmModal.onConfirm}
                  className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-extrabold rounded-xl transition-all shadow-md shadow-rose-600/10"
                >
                  確認執行
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 5. Custom Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 right-6 z-50 pointer-events-none"
          >
            <div className={`p-4 rounded-2xl border shadow-xl flex items-center gap-3 backdrop-blur-md max-w-sm ${
              toast.type === "success" 
                ? "bg-teal-50/95 border-teal-100 text-teal-800" 
                : toast.type === "error" 
                ? "bg-rose-50/95 border-rose-100 text-rose-800" 
                : "bg-slate-900 border-slate-800 text-white shadow-2xl"
            }`}>
              <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-white flex-shrink-0 ${
                toast.type === "success" ? "bg-teal-500" : toast.type === "error" ? "bg-rose-500" : "bg-slate-500"
              }`}>
                {toast.type === "success" ? (
                  <DynamicIcon name="Check" className="w-3.5 h-3.5" />
                ) : (
                  <DynamicIcon name="ShieldAlert" className="w-3.5 h-3.5" />
                )}
              </div>
              <span className="text-xs font-bold leading-none">{toast.message}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
