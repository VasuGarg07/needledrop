export type NowPlaying = {
  title: string;
  artist: string;
  isPlaying: boolean;
  cover: string | null;
};

export type MediaAction = "toggle" | "next" | "previous";

declare global {
  interface Window {
    media: {
      onUpdate: (callback: (song: NowPlaying | null) => void) => () => void;
      control: (action: MediaAction) => void;
    };
  }
}
