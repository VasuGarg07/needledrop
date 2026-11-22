import { app, BrowserWindow, ipcMain, screen } from "electron";
import { spawn } from "node:child_process";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";
import type { MediaAction, NowPlaying } from "../src/types";

type ItunesSearch = {
  results: { artworkUrl100: string }[];
};

if (!app.requestSingleInstanceLock()) {
  app.exit(0);
}

const currentFolder = path.dirname(fileURLToPath(import.meta.url));
const coverCache = new Map<string, string>();

let mainWindow: BrowserWindow | null = null;
let latestState: NowPlaying | null = null;
let lastSent: NowPlaying | null = null;

async function searchItunesCover(searchText: string): Promise<string | null> {
  try {
    const term = encodeURIComponent(searchText);
    const searchResponse = await fetch(`https://itunes.apple.com/search?entity=song&limit=1&term=${term}`);
    const search = (await searchResponse.json()) as ItunesSearch;
    const firstResult = search.results[0];
    if (firstResult === undefined) {
      return null;
    }
    const imageUrl = firstResult.artworkUrl100.replace("100x100bb", "600x600bb");
    const imageResponse = await fetch(imageUrl);
    const imageBytes = Buffer.from(await imageResponse.arrayBuffer());
    return `data:image/jpeg;base64,${imageBytes.toString("base64")}`;
  } catch {
    return null;
  }
}

async function findOnlineCover(title: string, artist: string): Promise<string | null> {
  const cacheKey = `${title}|${artist}`;
  const cached = coverCache.get(cacheKey);
  if (cached !== undefined) {
    return cached;
  }
  const shortTitle = title.split(" (")[0].split(" - ")[0];
  let cover = await searchItunesCover(`${title} ${artist}`);
  if (cover === null) {
    cover = await searchItunesCover(`${shortTitle} ${artist}`);
  }
  if (cover !== null) {
    coverCache.set(cacheKey, cover);
  }
  return cover;
}

function sendNowPlaying(song: NowPlaying | null) {
  lastSent = song;
  if (mainWindow !== null) {
    mainWindow.webContents.send("now-playing", song);
  }
}

async function handleSpotifyState(state: NowPlaying | null) {
  latestState = state;
  if (state === null || state.cover !== null) {
    sendNowPlaying(state);
    return;
  }
  const cover = await findOnlineCover(state.title, state.artist);
  if (latestState === state) {
    sendNowPlaying({ ...state, cover });
  }
}

const mediaScriptPath = app.isPackaged
  ? path.join(process.resourcesPath, "media.ps1")
  : path.join(currentFolder, "../electron/media.ps1");

const mediaReader = spawn(
  "powershell.exe",
  ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", mediaScriptPath],
  { windowsHide: true },
);

readline.createInterface({ input: mediaReader.stdout }).on("line", (line) => {
  handleSpotifyState(JSON.parse(line) as NowPlaying | null);
});

function createWindow() {
  const width = 340;
  const height = 112;
  const area = screen.getPrimaryDisplay().workArea;

  mainWindow = new BrowserWindow({
    width,
    height,
    x: area.x + area.width - width - 24,
    y: area.y + area.height - height - 24,
    frame: false,
    transparent: true,
    resizable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    hasShadow: false,
    webPreferences: {
      preload: path.join(currentFolder, "preload.mjs"),
    },
  });
  mainWindow.setAlwaysOnTop(true, "screen-saver");

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(currentFolder, "../dist/index.html"));
  }
}

ipcMain.on("request-now-playing", () => sendNowPlaying(lastSent));
ipcMain.on("media-control", (_event, action: MediaAction) => {
  mediaReader.stdin.write(`${action}\n`);
});

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  mediaReader.kill();
  app.quit();
});
