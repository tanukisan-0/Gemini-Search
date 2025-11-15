import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync,writeFileSync } from "fs";
import GeminiService from "./services/GeminiService.js"

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function createWindow() {
  const win = new BrowserWindow({
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
  
  let ServerURLs = [ "https://misskey.io" ];
  let gemini = new GeminiService(GEMINI,ServerURLs,100);

  // --- IPC ハンドラを登録 ---
  ipcMain.handle('send-message', async (event, msg) => {
    return await gemini.SendMessage(msg);
  });

  ipcMain.handle('get-apikey', () =>
  {
    return GEMINI
  });

  ipcMain.handle( 'save-apikey', (event, API_KEY) =>
  {
    const data = {
      GEMINI:API_KEY
    };
    writeFileSync("./keys/APIKEY.json", JSON.stringify(data, null, 2), "utf8");
    console.log("保存しました。")
  });

  createWindow();
});
