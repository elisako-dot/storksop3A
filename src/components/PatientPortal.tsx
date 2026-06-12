import React, { useState, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import DynamicIcon from "./Icons";
import { PricingDataset, CategoryInfo, CategoryData, Section, TableSection, NotesSection, SearchMatch } from "../types";

interface PatientPortalProps {
  data: PricingDataset;
  activeCategory: string;
  setActiveCategory: (key: string) => void;
  onAdminLoginClick: () => void;
}

export default function PatientPortal({
  data,
  activeCategory,
  setActiveCategory,
  onAdminLoginClick,
}: PatientPortalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const contentContainerRef = useRef<HTMLDivElement>(null);

  // Close search auto-complete when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const { categoriesData, categoriesList, groupsList } = data;

  // Render highlighters inside a cell or string
  const renderHighlightedText = (text: string, query: string) => {
    if (!query.trim()) return <span>{text}</span>;
    const regex = new RegExp(`(${query.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&")})`, "gi");
    const parts = text.split(regex);
    return (
      <span>
        {parts.map((part, i) =>
          regex.test(part) ? (
            <mark key={i} className="bg-yellow-100 text-yellow-900 px-0.5 rounded font-semibold border-b border-yellow-300">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </span>
    );
  };

  // Perform dynamic fuzzy match search
  const searchResults = useMemo((): SearchMatch[] => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    const resultsList: SearchMatch[] = [];

    for (const cat of categoriesList) {
      const catData = categoriesData[cat.key];
      if (!catData) continue;

      // Match category labels/titles
      if (cat.label.toLowerCase().includes(query) || catData.title.toLowerCase().includes(query)) {
        resultsList.push({
          categoryKey: cat.key,
          sectionName: catData.title,
          matches: [`分類：${catData.title}`],
        });
        continue;
      }

      // Match sections
      for (const section of catData.sections) {
        const matches: string[] = [];
        if (section.name.toLowerCase().includes(query)) {
          matches.push(`分區首頁：${section.name}`);
        }

        if (section.type === "notes") {
          for (const item of (section as NotesSection).items) {
            if (item.toLowerCase().includes(query)) {
              matches.push(item.length > 50 ? item.substring(0, 50) + "..." : item);
            }
          }
        } else {
          const tableSec = section as TableSection;
          if (tableSec.headers) {
            for (const header of tableSec.headers) {
              if (header.toLowerCase().includes(query)) {
                matches.push(`欄位：${header}`);
                break;
              }
            }
          }
          if (tableSec.rows) {
            for (const row of tableSec.rows) {
              const joinedRow = row.join(" ");
              if (joinedRow.toLowerCase().includes(query)) {
                matches.push(row.filter(Boolean).slice(0, 3).join(" | "));
              }
            }
          }
        }

        if (matches.length > 0) {
          resultsList.push({
            categoryKey: cat.key,
            sectionName: section.name,
            matches: matches.slice(0, 2), // Keep up to 2 previews
          });
        }
      }
    }

    return resultsList;
  }, [searchQuery, categoriesList, categoriesData]);

  const activeCategoryData = categoriesData[activeCategory] || { title: "", sections: [] };

  const handleSelectSearchResult = (categoryKey: string, sectionName: string) => {
    setActiveCategory(categoryKey);
    setIsSearchFocused(false);
    setSearchQuery("");

    // Attempt to scroll to the matched section
    setTimeout(() => {
      const element = document.getElementById(`section-${sectionName}`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
      } else if (contentContainerRef.current) {
        contentContainerRef.current.scrollTop = 0;
      }
    }, 150);
  };

  // Group items in sidebar
  const itemsByGroup = useMemo(() => {
    return groupsList.map((groupName) => {
      return {
        group: groupName,
        items: categoriesList.filter((c) => c.group === groupName),
      };
    });
  }, [categoriesList, groupsList]);

  return (
    <div className="flex flex-col md:flex-row h-screen bg-slate-50 overflow-hidden font-sans text-slate-800 antialiased">
      
      {/* 1. Sidebar - Desktop view */}
      <aside className="hidden md:flex w-64 flex-shrink-0 bg-white border-r border-slate-200 flex-col">
        {/* Sidebar Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
          <div className="w-9 h-9 bg-rose-500 rounded-xl flex items-center justify-center shadow-md shadow-rose-100">
            <DynamicIcon name="Activity" className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-extrabold text-slate-800 tracking-tight leading-tight">送子鳥生殖醫學</h2>
            <p className="text-[11px] text-slate-400 font-medium">手術批價查詢系統</p>
          </div>
        </div>

        {/* Sidebar Nav List */}
        <nav className="flex-1 py-3 px-3 overflow-y-auto space-y-4">
          {itemsByGroup.map((groupObj) => (
            <div key={groupObj.group}>
              <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 px-3 py-1 mb-1.5 border-l-2 border-slate-200">
                {groupObj.group}
              </div>
              <div className="space-y-0.5">
                {groupObj.items.map((cat) => {
                  const isActive = activeCategory === cat.key;
                  return (
                    <button
                      key={cat.key}
                      onClick={() => {
                        setActiveCategory(cat.key);
                        if (contentContainerRef.current) contentContainerRef.current.scrollTop = 0;
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-all text-xs font-semibold ${
                        isActive
                          ? "bg-rose-50 text-rose-700 shadow-sm"
                          : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                      }`}
                    >
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                          isActive ? "bg-rose-100/60" : "bg-slate-100"
                        }`}
                      >
                        <DynamicIcon
                          name={cat.icon}
                          className={`w-4 h-4 ${isActive ? "text-rose-600" : "text-slate-400"}`}
                        />
                      </div>
                      <span className="truncate flex-1">{cat.label}</span>
                      {isActive && (
                        <motion.div
                          layoutId="active-dot"
                          className="w-1.5 h-1.5 rounded-full bg-rose-500"
                          transition={{ type: "spring", stiffness: 350, damping: 30 }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="px-5 py-4 border-t border-slate-100 bg-slate-50/50 flex flex-col gap-2">
          <div className="flex justify-between items-center text-[10px] text-slate-400 font-medium">
            <span>資料版本：2026/05</span>
            <span>{categoriesList.length} 個分區</span>
          </div>
          <button
            onClick={onAdminLoginClick}
            className="w-full mt-1 py-1.5 px-3 bg-white border border-slate-200 text-slate-600 hover:text-rose-600 hover:border-rose-200 transition-all rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 shadow-sm hover:shadow"
          >
            <DynamicIcon name="Lock" className="w-3 h-3" />
            <span>後台登入修訂</span>
          </button>
        </div>
      </aside>

      {/* 2. Mobile Nav Header */}
      <header className="md:hidden h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 z-40">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600"
          >
            <DynamicIcon name="Menu" className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-rose-500 rounded-lg flex items-center justify-center">
              <DynamicIcon name="Activity" className="w-4 h-4 text-white" />
            </div>
            <span className="text-xs font-bold text-slate-800">手術批價查詢</span>
          </div>
        </div>
        <button
          onClick={onAdminLoginClick}
          className="py-1 px-2 border border-slate-200 text-slate-600 hover:text-rose-600 rounded-lg text-[10px] font-bold flex items-center gap-1"
        >
          <DynamicIcon name="Lock" className="w-2.5 h-2.5" />
          <span>管理</span>
        </button>
      </header>

      {/* Mobile Drawer Navigation */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            {/* Overlay backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 bg-black z-50 md:hidden"
            />
            {/* Drawer */}
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "tween", duration: 0.25 }}
              className="fixed top-0 bottom-0 left-0 w-64 bg-white z-50 md:hidden flex flex-col shadow-2xl"
            >
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-rose-500 rounded-lg flex items-center justify-center">
                    <DynamicIcon name="Activity" className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xs font-black text-slate-800">手術批價查詢</h2>
                    <p className="text-[9px] text-slate-400 font-bold">送子鳥生殖醫學</p>
                  </div>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                >
                  <DynamicIcon name="X" className="w-4 h-4" />
                </button>
              </div>

              <nav className="flex-1 py-3 px-3 overflow-y-auto space-y-4">
                {itemsByGroup.map((groupObj) => (
                  <div key={groupObj.group}>
                    <div className="text-[9px] uppercase tracking-wider font-extrabold text-slate-400 px-3 py-1 mb-1">
                      {groupObj.group}
                    </div>
                    <div className="space-y-0.5">
                      {groupObj.items.map((cat) => {
                        const isActive = activeCategory === cat.key;
                        return (
                          <button
                            key={cat.key}
                            onClick={() => {
                              setActiveCategory(cat.key);
                              setMobileMenuOpen(false);
                              if (contentContainerRef.current) contentContainerRef.current.scrollTop = 0;
                            }}
                            className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-left transition-all text-xs font-semibold ${
                              isActive ? "bg-rose-50 text-rose-700" : "text-slate-500 hover:bg-slate-50"
                            }`}
                          >
                            <DynamicIcon
                              name={cat.icon}
                              className={`w-3.5 h-3.5 ${isActive ? "text-rose-600" : "text-slate-400"}`}
                            />
                            <span className="truncate">{cat.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </nav>

              <div className="p-4 border-t border-slate-100 bg-slate-50">
                <p className="text-[10px] text-slate-400 font-medium">版本：2026/05</p>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* 3. Main Content Stage */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Search header bar */}
        <header className="bg-white border-b border-slate-150 px-6 py-3 flex-shrink-0 flex items-center justify-between">
          <div className="relative w-full max-w-xl" ref={searchRef}>
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
              <DynamicIcon name="Search" className="w-4 h-4" />
            </div>
            
            <input
              type="text"
              placeholder="搜尋項目、費用、備註、規則... (例如: 掛號費, OPU, 凍精, VIP)"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsSearchFocused(true);
              }}
              onFocus={() => setIsSearchFocused(true)}
              className="w-full h-10 pl-10 pr-10 bg-slate-50 hover:bg-slate-100/70 focus:bg-white text-xs border border-slate-200 focus:border-rose-400 focus:ring-2 focus:ring-rose-100 rounded-xl leading-none transition-all outline-none"
            />
            
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <DynamicIcon name="X" className="w-4 h-4" />
              </button>
            )}

            {/* Smart Search Predictions Dropdown */}
            <AnimatePresence>
              {isSearchFocused && searchQuery.trim() && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-96 overflow-y-auto"
                >
                  <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 bg-slate-50/50 rounded-t-xl">
                    <span className="text-[11px] text-slate-500 font-bold">
                      搜尋結果：找到 {searchResults.length} 個分區匹配
                    </span>
                    <button
                      onClick={() => setIsSearchFocused(false)}
                      className="text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      <DynamicIcon name="X" className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {searchResults.length === 0 ? (
                    <div className="px-4 py-8 text-center text-slate-400 text-xs">
                      <p className="font-semibold mb-1">未找到相關資料</p>
                      <p className="text-[10px] opacity-70">請換個關鍵字搜尋 (例如簡寫或英文學名)</p>
                    </div>
                  ) : (
                    searchResults.map((res, idx) => {
                      const catInfo = categoriesList.find((c) => c.key === res.categoryKey);
                      return (
                        <button
                          key={idx}
                          role="menuitem"
                          onClick={() => handleSelectSearchResult(res.categoryKey, res.sectionName)}
                          className="w-full text-left px-4 py-3 hover:bg-rose-50/40 border-b border-slate-50 last:border-none transition-colors group"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            {catInfo && (
                              <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-md bg-rose-50 text-rose-600 uppercase border border-rose-100">
                                {catInfo.label}
                              </span>
                            )}
                            <span className="text-xs font-extrabold text-slate-700 group-hover:text-rose-600 transition-colors">
                              {res.sectionName}
                            </span>
                          </div>
                          {res.matches.map((m, mIdx) => (
                            <p key={mIdx} className="text-[11px] text-slate-400 font-medium truncate pl-1 leading-relaxed">
                              {renderHighlightedText(m, searchQuery)}
                            </p>
                          ))}
                        </button>
                      );
                    })
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          <div className="hidden sm:block text-[11px] font-extrabold text-rose-500/80 tracking-wider">
            SurgiPrice • 送子鳥手術批價
          </div>
        </header>

        {/* Categories Detail stage */}
        <div className="flex-1 overflow-y-auto" ref={contentContainerRef}>
          <div className="px-6 py-6 max-w-5xl mx-auto w-full">
            
            {/* Section Title Hero */}
            <div className="mb-6 border-b border-slate-200/60 pb-4 flex flex-col sm:flex-row sm:items-end justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white shadow-md">
                  <DynamicIcon
                    name={categoriesList.find((c) => c.key === activeCategory)?.icon || "Activity"}
                    className="w-5 h-5 text-white"
                  />
                </div>
                <div>
                  <h1 className="text-lg font-black text-slate-900 tracking-tight">{activeCategoryData.title}</h1>
                  <p className="text-[11px] text-slate-400 font-bold mt-0.5">送子鳥臨床處置收費與健保/自費規則</p>
                </div>
              </div>
              {activeCategoryData.updated && (
                <span className="text-[11px] text-slate-400 font-bold bg-slate-100 hover:bg-slate-200/60 font-mono px-3 py-1 rounded-full transition-colors self-start sm:self-auto">
                  最後更新：{activeCategoryData.updated}
                </span>
              )}
            </div>

            {/* Sections Content List (Map tables & lists) */}
            <div className="space-y-8">
              {activeCategoryData.sections.map((section, sIdx) => {
                const isTable = !section.type || section.type === "table";
                return (
                  <motion.div
                    key={sIdx}
                    id={`section-${section.name}`}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: sIdx * 0.05 }}
                    className="bg-white border border-slate-200/80 rounded-2xl shadow-sm hover:shadow-md transition-shadow overflow-hidden"
                  >
                    
                    {/* Section Banner Header */}
                    <div className="bg-slate-50/60 px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                      <h3 className="text-xs font-black text-slate-800 tracking-wide flex items-center gap-2">
                        <span className="w-1.5 h-3 bg-rose-500 rounded-full" />
                        {section.name}
                      </h3>
                      <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest font-mono">
                        {isTable ? "收費表" : "注意事項 S.O.P"}
                      </span>
                    </div>

                    {/* Section Body */}
                    <div className="p-1 sm:p-4">
                      {isTable ? (
                        <div className="overflow-x-auto rounded-xl border border-slate-100">
                          <table className="w-full text-left border-collapse whitespace-nowrap md:whitespace-normal">
                            <thead>
                              <tr className="bg-slate-55 border-b border-slate-100">
                                {(section as TableSection).headers?.map((header, hIdx) => (
                                  <th
                                    key={hIdx}
                                    className="px-4 py-2.5 text-[11px] font-extrabold text-slate-500 tracking-wider"
                                  >
                                    {header}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {(section as TableSection).rows?.map((row, rIdx) => (
                                <tr
                                  key={rIdx}
                                  className="border-b last:border-none border-slate-100/50 hover:bg-slate-50/50 transition-colors odd:bg-white even:bg-slate-50/20"
                                >
                                  {row.map((cell, cIdx) => {
                                    // Highlight price units of surgical numbers or money figures
                                    const isNumeric = /^[0-9,%*#$\-.\+/支支支D顆組元次張]+$/.test(cell.trim()) || cell.includes(",") || cell.includes("$");
                                    return (
                                      <td
                                        key={cIdx}
                                        className={`px-4 py-3 text-xs leading-relaxed font-semibold ${
                                          isNumeric ? "text-slate-900 font-mono font-black" : "text-slate-600"
                                        }`}
                                      >
                                        {cell.split("\n_").join("\n").split("\n").map((line, lineIdx) => (
                                          <div key={lineIdx} className={lineIdx > 0 ? "mt-1 text-[11px] text-slate-400 font-medium" : ""}>
                                            {line}
                                          </div>
                                        ))}
                                      </td>
                                    );
                                  })}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <ul className="space-y-2.5 px-4 py-2">
                          {(section as NotesSection).items?.map((item, iIdx) => {
                            // Detect lists starts with points or prefixes
                            const isNumbered = /^[a-zA-Z0-9_\u4e00-\u9fa5\s]+[.:、]/.test(item);
                            return (
                              <li
                                key={iIdx}
                                className={`text-[11.5px] leading-relaxed flex gap-2 ${
                                  isNumbered ? "text-slate-700 font-semibold" : "text-slate-500 font-medium"
                                }`}
                              >
                                {!isNumbered && <span className="text-rose-400 flex-shrink-0 mt-1">•</span>}
                                <span className="flex-1">{item}</span>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Zero state guidelines */}
            {activeCategoryData.sections.length === 0 && (
              <div className="py-20 text-center text-slate-400 text-sm">
                <DynamicIcon name="Files" className="w-12 h-12 mx-auto mb-3 opacity-30 text-rose-500" />
                <p className="font-extrabold mb-1 text-slate-800">該分類目前不包含任何臨床處置或表單</p>
                <p className="text-xs text-slate-400">管理員可在後台新增此處置表格</p>
              </div>
            )}
            
          </div>
        </div>

      </div>

    </div>
  );
}
