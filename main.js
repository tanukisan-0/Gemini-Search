import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from "fs";
import GeminiService from "./services/GeminiService.js"
import { trace } from 'console';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadFile( folderPath, fileName, data)
{
  const filepath = path.join(folderPath, fileName);

  try {
    data = readFileSync(filepath, "utf-8");
    return data;
  } catch (e) {
    console.log(e);
    data = JSON.stringify(data, null, 2)

    if (!existsSync(folderPath))
    {
      mkdirSync(folderPath, { recursive: true });
      writeFileSync( filepath, data, "utf8");
    }

    try {
      writeFileSync( filepath, data, "utf8");
    } catch (e) {
      console.log(e);
    }

    return data;
  }
}

let win;

function createWindow() {
  win = new BrowserWindow({
    width: 800,
    height: 600,
    //autoHideMenuBar: true,
    //menuBarVisible: false,
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
  const keyPath = path.join(app.getPath('userData'), 'keys');
  const configPath =  path.join(app.getPath('userData'));

  let keys, config;

  keys = loadFile( keyPath, 'APIKEY.json', {"GEMINI": ""});

  config = loadFile( configPath, 'config.json', {"GEMINI_MODEL": "gemini-2.5-flash"});

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
    writeFileSync(path.join(keyPath, 'APIKEY.json'), JSON.stringify({ GEMINI: API_KEY }, null, 2), "utf8");
    writeFileSync(path.join(configPath, 'config.json'), JSON.stringify({ GEMINI_MODEL: MODEL }, null, 2), "utf8");

    console.log("保存しました。");
  });

  createWindow();

  win.webContents.on('did-finish-load', () => {
    win.webContents.send('send-apikey', GEMINI);
    win.webContents.send('send-model', GEMINI_MODEL);
  });

});
