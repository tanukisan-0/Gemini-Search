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
  const keys = readFileSync("./keys/APIKEY.json", "utf-8");
  const config = readFileSync("config.json", "utf-8");
  const { GEMINI } = JSON.parse(keys);
  const { GEMINI_MODEL } = JSON.parse(config)
  console.log("GEMINI_TYPE:", GEMINI_MODEL);
  
  let ServerURLs = ["https://misskey.io"];
  let gemini = new GeminiService(GEMINI, GEMINI_MODEL, ServerURLs, 100);


  // --- IPC ハンドラ ---
  ipcMain.handle('send-message', async (event, msg) => {
    try {
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

      return "error : " + err;
    }
  });

  ipcMain.handle('save-config-keys', (event, API_KEY, MODEL) => {
    gemini.API_KEY = API_KEY;
    gemini.GEMINI_MODEL = MODEL;

    const tmpkeys = { GEMINI: API_KEY };
    const tmpconfig = { GEMINI_MODEL:MODEL };
    writeFileSync("./keys/APIKEY.json", JSON.stringify(tmpkeys, null, 2), "utf8");
    writeFileSync("config.json", JSON.stringify(tmpconfig, null, 2), "utf8");
    console.log("保存しました。");
  });

  createWindow();
  win.webContents.on('did-finish-load', () => {
    win.webContents.send('send-map-data', TESTDATA);
    win.webContents.send('send-apikey', GEMINI);
    win.webContents.send('send-model', GEMINI_MODEL);
  });
});
