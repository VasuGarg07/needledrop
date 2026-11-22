import { contextBridge, ipcRenderer, type IpcRendererEvent } from "electron";
import type { MediaAction, NowPlaying } from "../src/types";

contextBridge.exposeInMainWorld("media", {
  onUpdate: (callback: (song: NowPlaying | null) => void) => {
    const listener = (_event: IpcRendererEvent, song: NowPlaying | null) => callback(song);
    ipcRenderer.on("now-playing", listener);
    ipcRenderer.send("request-now-playing");
    return () => ipcRenderer.removeListener("now-playing", listener);
  },
  control: (action: MediaAction) => ipcRenderer.send("media-control", action),
});
