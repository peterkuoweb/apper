// js/export.js

// --- Save and Load Project ---

document.getElementById('save-project-btn').addEventListener('click', () => {
    // Ensure current workspace is saved to state
    saveWorkspaceState();

    const projectData = JSON.stringify(apperState);
    const blob = new Blob([projectData], {type: "application/json;charset=utf-8"});
    saveAs(blob, "project.apper");
});

// --- Export to HTML / PWA (ZIP) ---

document.getElementById('export-html-btn').addEventListener('click', async () => {
    saveWorkspaceState();

    const zip = new JSZip();

    // 1. Generate HTML for each page
    let htmlContent = `
<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Apper 匯出專案</title>
    <link rel="manifest" href="manifest.json">
    <style>
        body, html { margin: 0; padding: 0; height: 100%; font-family: sans-serif; }
        .page { display: none; width: 100%; height: 100%; display: flex; flex-direction: column; }
        .page.active { display: flex !important; } /* Only active page is flex */
        /* hide pages by default but override with .active */
        div.page:not(.active) { display: none !important; }
        /* Reset elements */
        .page > * { box-sizing: border-box; margin: 0; padding: 5px; }
    </style>
</head>
<body>
`;

    apperState.pages.forEach((page, index) => {
        const isActive = index === 0 ? 'active' : '';
        htmlContent += `    <div id="${page.id}" class="page ${isActive}">\n`;

        page.elements.forEach(el => {
            // Don't render spacer content, but render the element
            const tagName = getTagName(el.type);
            let attributesStr = `id="${el.id}" `;

            for (const [key, value] of Object.entries(el.attributes)) {
                attributesStr += `${key}="${value}" `;
            }

            // Clean up style (remove dashed border for spacer in export)
            let styleStr = el.style;
            if(el.type === 'spacer') {
                 styleStr = styleStr.replace(/border:[^;]+;/, '');
            }
            attributesStr += `style="${styleStr}" `;

            htmlContent += `        <${tagName} ${attributesStr}>`;
            if (el.type !== 'input' && el.type !== 'img' && el.type !== 'spacer') {
                htmlContent += el.content;
            }
            htmlContent += `</${tagName}>\n`;
        });

        htmlContent += `    </div>\n`;
    });

    htmlContent += `
    <script src="app_logic.js"></script>
    <script>
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('sw.js');
        }
    </script>
</body>
</html>`;

    zip.file("index.html", htmlContent);

    // 2. Generate JavaScript (App Logic + Navigation)
    let jsContent = `
// Navigation and Data Logic
window.apperData = {};

window.navigateToPage = function(pageId, data) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    // Show target page
    const target = document.getElementById(pageId);
    if(target) {
        target.classList.add('active');
    }
    // Store data
    if(data !== undefined) {
        window.apperData[pageId] = data;
    }
};

window.getPageData = function() {
    // Find active page
    const activePage = document.querySelector('.page.active');
    if(activePage) {
        return window.apperData[activePage.id] || null;
    }
    return null;
};

// Generated Blockly Code
`;

    apperState.pages.forEach(page => {
        if(page.workspaceXml) {
             const xml = Blockly.Xml.textToDom(page.workspaceXml);
             const tempWorkspace = new Blockly.Workspace();
             Blockly.Xml.domToWorkspace(xml, tempWorkspace);

             jsContent += `\n/* Page: ${page.name} */\n`;
             try {
                const code = javascript.javascriptGenerator.workspaceToCode(tempWorkspace);
                jsContent += code;
             } catch(e) {
                 console.error("Error generating code for page " + page.name, e);
             }
             tempWorkspace.dispose();
        }
    });

    zip.file("app_logic.js", jsContent);

    // 3. Generate Manifest for PWA
    const manifest = {
        "name": "Apper Project",
        "short_name": "Apper",
        "start_url": "./index.html",
        "display": "standalone",
        "background_color": "#ffffff",
        "theme_color": "#4CAF50",
        "icons": [
            {
                "src": "icon.png",
                "sizes": "192x192",
                "type": "image/png"
            }
        ]
    };
    zip.file("manifest.json", JSON.stringify(manifest, null, 2));

    // 4. Generate Service Worker
    const swContent = `
const CACHE_NAME = 'apper-pwa-v1';
const urlsToCache = [
  './',
  './index.html',
  './app_logic.js',
  './manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
  );
});
`;
    zip.file("sw.js", swContent);

    // Generate Dummy Icon (1x1 transparent png)
    const dummyIconBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
    zip.file("icon.png", dummyIconBase64, {base64: true});

    // Generate ZIP and Download
    zip.generateAsync({type:"blob"}).then(function(content) {
        saveAs(content, "apper_project.zip");
    });
});

// --- Export to Native (APK/iOS/EXE) ---

document.getElementById('export-native-btn').addEventListener('click', () => {
    // True native compilation requires a backend build server (e.g., Cordova, Capacitor, Nativefier).
    // For a pure client-side web editor, we provide the PWA ZIP and instructions for wrapping.

    let instructions = `
# Apper 專案原生轉換指南

因為 Apper 是基於瀏覽器的 PWA 底層設計，要將其轉換為 Android (APK), iOS (IPA) 或 Windows/Mac (EXE/DMG)，你需要使用封裝工具。

請先使用「匯出 PWA (ZIP)」下載您的專案，解壓縮後作為來源檔案。

## 1. 轉換為 Android APK / AAB
選項 A: 使用 PWABuilder (最簡單)
  1. 將解壓縮的網站部署到任何靜態伺服器 (例如 GitHub Pages, Vercel)。
  2. 前往 https://www.pwabuilder.com/
  3. 輸入您的網址，點擊打包，選擇 Android 即可獲得 APK/AAB。

選項 B: 使用 Capacitor (適合進階開發者)
  1. 安裝 Node.js
  2. 執行 \`npm install @capacitor/cli @capacitor/core\`
  3. 執行 \`npx cap init\`
  4. 將解壓縮的專案放入 \`www\` 資料夾。
  5. 執行 \`npx cap add android\` 和 \`npx cap open android\` (需要 Android Studio)。

## 2. 轉換為 iOS APP
因為 Apple 的限制，您必須有 Mac 電腦並安裝 Xcode。
  1. 使用上述提到的 Capacitor 工具。
  2. 執行 \`npx cap add ios\` 和 \`npx cap open ios\`。
  3. 在 Xcode 中編譯並發布到 App Store。

## 3. 轉換為 Windows / Mac 桌面應用程式 (EXE/DMG)
選項 A: 使用 Electron/Nativefier
  1. 安裝 Node.js
  2. 執行 \`npm install -g nativefier\`
  3. 將您的 PWA 部署到網路上。
  4. 執行 \`nativefier "您的網址"\`

選項 B: PWA 桌面安裝
  Apper 匯出的專案已經符合 PWA 標準。只要將專案上傳至支援 HTTPS 的伺服器，使用者即可使用 Chrome 或 Edge 瀏覽器，直接在網址列點選「安裝」，將其安裝為桌面應用程式，與原生 EXE 體驗相同。
`;

    // Download instructions text file alongside prompting to export PWA
    const blob = new Blob([instructions], {type: "text/markdown;charset=utf-8"});
    saveAs(blob, "Apper_Native_Export_Instructions.md");

    // Suggest downloading PWA zip
    if (confirm('已下載轉換說明書 (Apper_Native_Export_Instructions.md)。\n是否現在要一併下載 PWA ZIP 專案包以供轉換使用？')) {
        document.getElementById('export-html-btn').click();
    }
});

document.getElementById('load-project-btn').addEventListener('click', () => {
    document.getElementById('load-project-input').click();
});

document.getElementById('load-project-input').addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);

            // Validate data broadly
            if(data && Array.isArray(data.pages)) {
                // Restore state
                apperState.pages = data.pages;
                apperState.currentPageId = data.currentPageId;
                apperState.elementCounter = data.elementCounter;
                apperState.pageCounter = data.pageCounter;
                apperState.dataContext = data.dataContext || {};

                // Re-render UI
                renderPagesList();
                renderElementsList();
                updatePreview();
                loadWorkspaceState();

                if(typeof updateDynamicBlocks === 'function') updateDynamicBlocks();

                alert('專案載入成功！');
            } else {
                alert('無效的專案檔案');
            }
        } catch (error) {
            console.error(error);
            alert('載入專案時發生錯誤: ' + error.message);
        }
    };
    reader.readAsText(file);
    // Reset input
    event.target.value = '';
});
