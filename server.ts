import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

// Curly-brace matcher to extract objects from minified JS
function extractObjectByPrefix(content: string, prefix: string): any {
  const index = content.indexOf(prefix);
  if (index === -1) {
    console.error(`Prefix "${prefix}" not found.`);
    return null;
  }
  
  let startIndex = index + prefix.length;
  // find the starting bracket: { or [
  while (startIndex < content.length && content[startIndex] !== "{" && content[startIndex] !== "[") {
    startIndex++;
  }
  if (startIndex >= content.length) return null;
  
  const startChar = content[startIndex];
  const endChar = startChar === "{" ? "}" : "]";
  let depth = 1;
  let currIndex = startIndex + 1;
  let inString = false;
  let stringChar = "";
  
  while (currIndex < content.length && depth > 0) {
    const char = content[currIndex];
    if (inString) {
      if (char === stringChar && content[currIndex - 1] !== "\\") {
        inString = false;
      }
    } else {
      if (char === '"' || char === "'" || char === "`") {
        inString = true;
        stringChar = char;
      } else if (char === startChar) {
        depth++;
      } else if (char === endChar) {
        depth--;
      }
    }
    currIndex++;
  }
  
  const rawString = content.substring(startIndex, currIndex);
  
  // Clean up and parse the object
  try {
    const mockScope = {
      mx: "Building2",
      gx: "Percent",
      Ku: "Activity",
      us: "Clipboard",
      vx: "Pills",
      sx: "Snowflake",
      xx: "Heart",
      fx: "FileText",
      px: "ShieldAlert",
      rx: "Globe",
    };
    
    const evalFunc = new Function("scope", `
      with(scope) {
        return (${rawString});
      }
    `);
    return evalFunc(mockScope);
  } catch (err: any) {
    console.error(`Failed to evaluate object for prefix: ${prefix}`, err.message);
    return rawString;
  }
}

async function extractPricingData() {
  const jsPath = path.join(process.cwd(), "src", "surgiprice_bundle.js");
  if (!fs.existsSync(jsPath)) {
    console.log("[Extractor] JS bundle doesn't exist yet.");
    return;
  }
  const code = fs.readFileSync(jsPath, "utf-8");
  console.log("[Extractor] Scraping full database from JS...");

  const varNames = [
    { key: "registration", prefix: "t2=" },
    { key: "discount", prefix: "e2=" },
    { key: "fbt", prefix: "n2=" },
    { key: "opu", prefix: "a2=" },
    { key: "era", prefix: "l2=" },
    { key: "hsg", prefix: "i2=" },
    { key: "storage", prefix: "o2=" },
    { key: "wedding", prefix: "s2=" },
    { key: "insurance", prefix: "r2=" },
    { key: "other_surgery", prefix: "u2=" },
    { key: "overseas", prefix: "c2=" },
    { key: "green_egg", prefix: "f2=" },
    { key: "sop_drug", prefix: "d2=" },
    { key: "lnc", prefix: "m2=" },
    { key: "ic_contract", prefix: "h2=" },
  ];
  
  // Extract all 15 content objects
  const categoriesData: any = {};
  for (const item of varNames) {
    const obj = extractObjectByPrefix(code, item.prefix);
    if (obj) {
      categoriesData[item.key] = obj;
    }
  }
  
  // Statically define the categories and groups metadata list to avoid brace errors
  const categoriesList = [
    { key: "registration", label: "掛號費", icon: "Building2", color: "bg-blue-100 text-blue-700", group: "基本費用" },
    { key: "discount", label: "優惠準則", icon: "Percent", color: "bg-rose-100 text-rose-700", group: "基本費用" },
    { key: "fbt", label: "FBT 胚胎植入術", icon: "Activity", color: "bg-pink-100 text-pink-700", group: "手術療程" },
    { key: "opu", label: "OPU 取卵術 / PGS", icon: "ClipboardList", color: "bg-purple-100 text-purple-700", group: "手術療程" },
    { key: "era", label: "ERA 子宮內膜容受性", icon: "Activity", color: "bg-indigo-100 text-indigo-700", group: "手術療程" },
    { key: "hsg", label: "H 子宮鏡 / HSG", icon: "Files", color: "bg-cyan-100 text-cyan-700", group: "手術療程" },
    { key: "other_surgery", label: "其他手術", icon: "Layers", color: "bg-teal-100 text-teal-700", group: "手術療程" },
    { key: "sop_drug", label: "術後帶藥 SOP", icon: "Pills", color: "bg-violet-100 text-violet-700", group: "手術療程" },
    { key: "storage", label: "冷凍保存費", icon: "Snowflake", color: "bg-amber-100 text-amber-700", group: "套組方案" },
    { key: "wedding", label: "婚健套組", icon: "Heart", color: "bg-green-100 text-green-700", group: "套組方案" },
    { key: "ic_contract", label: "IC 合約（新制）", icon: "FileText", color: "bg-sky-100 text-sky-700", group: "套組方案" },
    { key: "lnc", label: "LnC 合療方案", icon: "Activity", color: "bg-fuchsia-100 text-fuchsia-700", group: "套組方案" },
    { key: "green_egg", label: "綠色凍卵", icon: "Activity", color: "bg-emerald-100 text-emerald-700", group: "套組方案" },
    { key: "insurance", label: "健保藥物", icon: "ShieldAlert", color: "bg-orange-100 text-orange-700", group: "藥物資訊" },
    { key: "overseas", label: "海管費類型", icon: "Globe", color: "bg-slate-100 text-slate-700", group: "其他" }
  ];

  const groupsList = ["基本費用", "手術療程", "套組方案", "藥物資訊", "其他"];
  
  const parsedData = {
    categoriesData,
    categoriesList,
    groupsList,
  };

  const dataDir = path.join(process.cwd(), "src", "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  const outPath = path.join(dataDir, "surgiprice_data.json");
  fs.writeFileSync(outPath, JSON.stringify(parsedData, null, 2), "utf-8");
  console.log(`[Extractor] Wrote complete pricing dataset to ${outPath}`);
}

async function fetchTargetContent() {
  const baseUrl = "https://surgiprice-yszhlqnz.manus.space";
  console.log(`[Startup] Fetching content of ${baseUrl}...`);
  try {
    const htmlResponse = await fetch(baseUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });
    if (!htmlResponse.ok) {
      throw new Error(`Failed to fetch main page: ${htmlResponse.status}`);
    }
    const html = await htmlResponse.text();
    const destHtmlPath = path.join(process.cwd(), "src", "surgiprice.html");
    fs.writeFileSync(destHtmlPath, html, "utf-8");
    console.log(`[Startup] Stored html to ${destHtmlPath}`);

    const jsUrl = `${baseUrl}/assets/index-CJetm40U.js`;
    console.log(`[Startup] Fetching JS from ${jsUrl}...`);
    const jsResponse = await fetch(jsUrl);
    if (jsResponse.ok) {
      const js = await jsResponse.text();
      const destJsPath = path.join(process.cwd(), "src", "surgiprice_bundle.js");
      fs.writeFileSync(destJsPath, js, "utf-8");
      console.log(`[Startup] Stored JS bundle to ${destJsPath}`);
    } else {
      console.error(`[Startup] Failed to fetch JS bundle: ${jsResponse.status}`);
    }

    const cssUrl = `${baseUrl}/assets/index-C-iPSkkh.css`;
    console.log(`[Startup] Fetching CSS from ${cssUrl}...`);
    const cssResponse = await fetch(cssUrl);
    if (cssResponse.ok) {
      const css = await cssResponse.text();
      const destCssPath = path.join(process.cwd(), "src", "surgiprice_bundle.css");
      fs.writeFileSync(destCssPath, css, "utf-8");
      console.log(`[Startup] Stored CSS bundle to ${destCssPath}`);
    } else {
      console.error(`[Startup] Failed to fetch CSS bundle: ${cssResponse.status}`);
    }

  } catch (error) {
    console.error("[Startup] Error fetching target content:", error);
  }
}

async function startServer() {
  await fetchTargetContent();
  await extractPricingData();

  const app = express();
  app.use(express.json());

  // Setup data directories
  const dataDir = path.join(process.cwd(), "src", "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // Admin password configuration
  const configPath = path.join(dataDir, "admin_config.json");
  if (!fs.existsSync(configPath)) {
    fs.writeFileSync(configPath, JSON.stringify({ password: "admin" }, null, 2), "utf-8");
  }

  // APIs
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Get active pricing data
  app.get("/api/pricing-data", (req, res) => {
    const dataPath = path.join(dataDir, "surgiprice_data.json");
    if (fs.existsSync(dataPath)) {
      const data = JSON.parse(fs.readFileSync(dataPath, "utf-8"));
      res.json(data);
    } else {
      res.status(404).json({ error: "Pricing data not found" });
    }
  });

  // Save updated pricing data
  app.post("/api/pricing-data", (req, res) => {
    const dataPath = path.join(dataDir, "surgiprice_data.json");
    try {
      fs.writeFileSync(dataPath, JSON.stringify(req.body, null, 2), "utf-8");
      res.json({ success: true, message: "Data saved successfully" });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to save data", details: err.message });
    }
  });

  // Admin Login
  app.post("/api/admin/login", (req, res) => {
    const { password } = req.body;
    try {
      const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      if (password === config.password) {
        res.json({ success: true, token: "admin-secret-token" });
      } else {
        res.status(401).json({ success: false, error: "密碼錯誤" });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Change Admin Password
  app.post("/api/admin/change-password", (req, res) => {
    const { oldPassword, newPassword } = req.body;
    try {
      const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      if (oldPassword === config.password) {
        config.password = newPassword;
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf-8");
        res.json({ success: true, message: "密碼修改成功" });
      } else {
        res.status(401).json({ success: false, error: "舊密碼錯誤" });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const PORT = 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
