/**
 * AI Tutor - Google Apps Script Backend (Zero Server Architecture)
 *
 * 部署指引:
 * 1. 建立一個新的 Google Apps Script 專案。
 * 2. 貼上此程式碼。
 * 3. 執行 `setupDatabase()` 初始化 Google Sheets。
 * 4. 點選「發布」 -> 「部署為網路應用程式」，權限設定為「所有人」。
 * 5. 將取得的 Web App URL 填入前端 `js/api.js` 中的 GAS_ENDPOINT。
 */

const SPREADSHEET_ID = SpreadsheetApp.getActiveSpreadsheet() ? SpreadsheetApp.getActiveSpreadsheet().getId() : "YOUR_SHEET_ID_HERE";
// Note: If running standalone, set your target sheet ID. If bound to a sheet, getActive() works.

// Basic SHA-256 Hashing helper for passwords
function hashPassword(password) {
  const rawHash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, password);
  let txtHash = '';
  for (let i = 0; i < rawHash.length; i++) {
    let hashVal = rawHash[i];
    if (hashVal < 0) {
      hashVal += 256;
    }
    if (hashVal.toString(16).length == 1) {
      txtHash += '0';
    }
    txtHash += hashVal.toString(16);
  }
  return txtHash;
}

// Basic Base64 encoding/decoding helper for "encryption" as required
function encryptKey(key) {
  return Utilities.base64Encode(key);
}

function decryptKey(encodedKey) {
  if (!encodedKey) return '';
  return Utilities.newBlob(Utilities.base64Decode(encodedKey)).getDataAsString();
}

function setupDatabase() {
  const ss = SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheets = ['Users', 'System_Settings', 'Courses', 'Custom_Courses', 'Progress'];

  sheets.forEach(name => {
    let sheet = ss.getSheetByName(name);
    if (!sheet) {
      sheet = ss.insertSheet(name);
    }
  });

  // Init Users Schema
  const userSheet = ss.getSheetByName('Users');
  if (userSheet.getLastRow() === 0) {
    userSheet.appendRow(['UserID', 'Account', 'PasswordHash', 'Role', 'Plan', 'Credits', 'LastClassDate', 'User_API_Provider', 'User_API_Key']);
    // Add default admin (password: admin123)
    userSheet.appendRow(['u_admin', 'admin', hashPassword('admin123'), 'admin', 'Premium', 30, '', '', '']);
  }

  // Init System_Settings Schema
  const sysSheet = ss.getSheetByName('System_Settings');
  if (sysSheet.getLastRow() === 0) {
    sysSheet.appendRow(['Premium_Price_Original', 'Premium_Price_Current', 'Upgrade_Redirect_URL', 'Official_AI_Provider', 'Official_AI_Model', 'Official_API_Keys']);
    sysSheet.appendRow([1200, 990, 'https://example.com/pay', 'Gemini', 'gemini-pro', 'KEY1,KEY2']); // comma separated for fallback
  }

  // Init Courses Schema
  const courseSheet = ss.getSheetByName('Courses');
  if (courseSheet.getLastRow() === 0) {
    courseSheet.appendRow(['CourseID', 'Name', 'Desc', 'TotalClasses', 'SystemPrompt']);
    courseSheet.appendRow(['c_1', 'Python 基礎', '學習基礎語法', 10, 'You are a python teacher.']);
  }
}

/**
 * Handle OPTIONS request for CORS
 */
function doOptions(e) {
  return createResponse({ success: true }, 200);
}

/**
 * Main Web App POST Entry Point
 */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    const payload = data.payload;

    let result = {};

    switch(action) {
      case 'login':
        result = handleLogin(payload);
        break;
      case 'getSettings':
        result = getSystemSettings();
        break;
      case 'getCourses':
        result = getCourses();
        break;
      case 'chatPremium':
        result = handlePremiumChat(payload);
        break;
      case 'updateUserSettings':
        result = updateUserSettings(payload);
        break;
      case 'adminGetUsers':
        result = adminGetUsers(payload);
        break;
      case 'adminUpdateUser':
        result = adminUpdateUser(payload);
        break;
      case 'updateSystemSettings':
        result = updateSystemSettings(payload);
        break;
      default:
        throw new Error("Invalid Action");
    }

    return createResponse(result);
  } catch (error) {
    return createResponse({ success: false, message: error.toString() }, 500);
  }
}

/**
 * Main Web App GET Entry Point (Fallback/Ping)
 */
function doGet(e) {
  return ContentService.createTextOutput("AI Tutor GAS Backend is active.")
      .setMimeType(ContentService.MimeType.TEXT);
}

// --- Handlers ---

function handleLogin(payload) {
  const { username, password } = payload;
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('Users');
  const data = sheet.getDataRange().getValues();

  const targetHash = hashPassword(password);

  // Skip header
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row[1] === username && row[2] === targetHash) {
      return {
        success: true,
        user: {
          userId: row[0],
          username: row[1],
          role: row[3],
          isPremium: row[4] === 'Premium',
          credits: row[5],
          apiProvider: row[7],
          apiKey: decryptKey(row[8]) // decrypt for frontend
        }
      };
    }
  }
  return { success: false, message: "登入失敗: 帳號或密碼錯誤" };
}

function getSystemSettings() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('System_Settings');
  const data = sheet.getDataRange().getValues()[1]; // Get first config row

  return {
    success: true,
    settings: {
      upgradeUrl: data[2],
      originalPrice: data[0],
      currentPrice: data[1]
    }
  };
}

function getCourses() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('Courses');
  const data = sheet.getDataRange().getValues();

  const courses = [];
  for (let i = 1; i < data.length; i++) {
    courses.push({
      id: data[i][0],
      name: data[i][1],
      desc: data[i][2],
      totalClasses: data[i][3],
      prompt: data[i][4]
    });
  }

  return { success: true, courses };
}

/**
 * Proxy for Premium Users using Official Keys (With Fallback Rotation)
 */
function handlePremiumChat(payload) {
  const { userId, messages, systemPrompt } = payload;

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sysSheet = ss.getSheetByName('System_Settings');
  const sysData = sysSheet.getDataRange().getValues()[1];

  const provider = sysData[3]; // e.g. Gemini
  const model = sysData[4];
  const keysString = sysData[5];
  const keys = keysString.split(',').map(k => k.trim());

  // Format messages
  const formattedMessages = [
      { role: "user", parts: [{ text: "System Instructions: " + systemPrompt }] },
      ...messages.map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.text }]
      }))
  ];

  let lastError = null;

  // Attempt fetching with key rotation
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    try {
      if (provider === 'Gemini') {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
        const options = {
          method: 'post',
          contentType: 'application/json',
          payload: JSON.stringify({ contents: formattedMessages }),
          muteHttpExceptions: true
        };

        const response = UrlFetchApp.fetch(url, options);
        const resJson = JSON.parse(response.getContentText());

        if (response.getResponseCode() === 200) {
           return { success: true, reply: resJson.candidates[0].content.parts[0].text };
        } else {
           lastError = resJson.error ? resJson.error.message : "API Error";
           Logger.log(`Key ${i} failed: ${lastError}`);
           continue;
        }
      }
    } catch (e) {
      lastError = e.toString();
      continue;
    }
  }

  return { success: false, message: `官方服務暫時不可用，請稍後再試。(${lastError})` };
}

function updateUserSettings(payload) {
  const { userId, provider, apiKey } = payload;
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('Users');
  const data = sheet.getDataRange().getValues();

  const encryptedKey = encryptKey(apiKey);

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === userId) {
      sheet.getRange(i + 1, 8).setValue(provider);
      sheet.getRange(i + 1, 9).setValue(encryptedKey);
      return { success: true };
    }
  }
  return { success: false, message: "找不到該使用者" };
}

function adminGetUsers() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('Users');
  const data = sheet.getDataRange().getValues();

  const users = [];
  for (let i = 1; i < data.length; i++) {
    users.push({
      userId: data[i][0],
      username: data[i][1],
      isPremium: data[i][4] === 'Premium',
      credits: data[i][5]
    });
  }
  return { success: true, users };
}

function adminUpdateUser(payload) {
  const { userId, isPremium } = payload;
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('Users');
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === userId) {
      sheet.getRange(i + 1, 5).setValue(isPremium ? 'Premium' : 'Free');
      return { success: true };
    }
  }
  return { success: false, message: "更新使用者失敗" };
}

function updateSystemSettings(payload) {
  const { originalPrice, currentPrice, upgradeUrl, provider, keys } = payload;
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('System_Settings');

  // Update first data row (row 2)
  sheet.getRange(2, 1).setValue(originalPrice);
  sheet.getRange(2, 2).setValue(currentPrice);
  sheet.getRange(2, 3).setValue(upgradeUrl);
  sheet.getRange(2, 4).setValue(provider);
  sheet.getRange(2, 6).setValue(keys);

  return { success: true };
}

/**
 * Helper to build standard JSON response with CORS headers
 */
function createResponse(data, code = 200) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeader("Access-Control-Allow-Origin", "*")
    .setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
    .setHeader("Access-Control-Allow-Headers", "Content-Type");
}
