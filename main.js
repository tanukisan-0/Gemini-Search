import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync, writeFileSync } from "fs";
import GeminiService from "./services/GeminiService.js"

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TESTDATA = JSON.parse(readFileSync("./testdata/map_data.text", "utf-8"))

let win;

function createWindow() {
  win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.loadFile('renderer.html');
}

app.whenReady().then(() => {
  const jsonText = readFileSync("./keys/APIKEY.json", "utf-8");
  const { GEMINI } = JSON.parse(jsonText);
  console.log("API_KEY:", GEMINI);
  
  let ServerURLs = ["https://misskey.io"];
  let gemini = new GeminiService(GEMINI, ServerURLs, 100);

  // ---- 503時のリトライ用 ----
  async function retryOn503(fn, maxRetry = 3) {
    for (let attempt = 1; attempt <= maxRetry; attempt++) {
      try {
        return await fn();
      } catch (err) {
        if (err.status === 503 && attempt < maxRetry) {
          const waitTime = 1000 * attempt;
          console.warn(`503: 再試行 ${attempt} 回目 → ${waitTime}ms 待機`);
          await new Promise(res => setTimeout(res, waitTime));
          continue;
        }
        throw err;
      }
    }
  }

  // --- IPC ハンドラ ---
  ipcMain.handle('send-message', async (event, msg) => {
    try {
      // 503 発生時は自動リトライ
      const response = await gemini.SendMessage(msg);

      console.log("responced:", response);

      try {
        win.webContents.send('send-map-data', response);
      } catch (e) {
        console.error("JSON parse error", e);
      }

      return response.message;

    } catch (err) {
      console.error("最終エラー:", err);

      return "error : 503-overloaded\nアクセスが集中しています。時間を置き再度お試しください。";
    }
  });

  ipcMain.handle('get-apikey', () => GEMINI);

  ipcMain.handle('save-apikey', (event, API_KEY) => {
    const data = { GEMINI: API_KEY };
    writeFileSync("./keys/APIKEY.json", JSON.stringify(data, null, 2), "utf8");
    console.log("保存しました。");
  });

  createWindow();
  win.webContents.on('did-finish-load', () => {
    win.webContents.send('send-map-data', TESTDATA);
  });
});
