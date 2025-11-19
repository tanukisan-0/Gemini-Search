import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from "fs";
import GeminiService from "./services/GeminiService.js"

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getResourcePath(...segments) {
  if (app.isPackaged) {
    // unpacked（asar アンパック）を優先
    const unpackedPath = path.join(process.resourcesPath, "app.asar.unpacked", ...segments);
    if (existsSync(unpackedPath)) return unpackedPath;

    // 通常の resources も fallback としてチェック
    const normalPath = path.join(process.resourcesPath, ...segments);
    return normalPath;
  } else {
    // 開発中: プロジェクトフォルダ
    return path.join(__dirname, ...segments);
  }
}


let win;

function createWindow() {
  win = new BrowserWindow({
    width: 800,
    height: 600,
    autoHideMenuBar: true,
    menuBarVisible: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.loadFile('renderer.html');
}

app.whenReady().then(() => {

  // === ここから 修正版 APIKEY の読み込み ===
  const keyPath = getResourcePath("keys", "APIKEY.json");
  const configPath = getResourcePath("config.json");

  let keys, config;

  try {
    keys = readFileSync(keyPath, "utf-8");
  } catch (e) {
    console.error("APIKEY.json 読み込みエラー", keyPath, e);
  }

  try {
    config = readFileSync(configPath, "utf-8");
  } catch (e) {
    console.error("config.json 読み込みエラー", configPath, e);
  }

  const { GEMINI } = JSON.parse(keys);
  const { GEMINI_MODEL } = JSON.parse(config);

  console.log("GEMINI_MODEL:", GEMINI_MODEL);

  // === Gemini 初期化 ===
  let ServerURLs = ["https://misskey.io"];
  let gemini = new GeminiService(GEMINI, GEMINI_MODEL, ServerURLs, 100);

  // === IPC ===
  ipcMain.handle('send-message', async (event, msg) => {
    try {
      const response = await gemini.SendMessage(msg);
      win.webContents.send('send-map-data', response);
      return response.message;

    } catch (err) {
      console.error("最終エラー:", err);
      return "error : " + err;
    }
  });

  ipcMain.handle('save-config-keys', (event, API_KEY, MODEL) => {
    gemini.API_KEY = API_KEY;
    gemini.GEMINI_MODEL = MODEL;

    // 保存先も getResourcePath を使う
    writeFileSync(keyPath, JSON.stringify({ GEMINI: API_KEY }, null, 2), "utf8");
    writeFileSync(configPath, JSON.stringify({ GEMINI_MODEL: MODEL }, null, 2), "utf8");

    console.log("保存しました。");
  });

  createWindow();

  win.webContents.on('did-finish-load', () => {
    win.webContents.send('send-apikey', GEMINI);
    win.webContents.send('send-model', GEMINI_MODEL);
  });

});
