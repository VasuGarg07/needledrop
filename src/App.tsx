import { useEffect, useRef, useState, type CSSProperties } from "react";
import { AnimatePresence, motion, useAnimationFrame, useMotionValue } from "motion/react";
import { FastAverageColor } from "fast-average-color";
import { Music, Pause, Play, SkipBack, SkipForward, X } from "lucide-react";
import "@fontsource-variable/dm-sans";
import "@fontsource/pt-serif/400.css";
import { DoubleNoteIcon, StudioMicIcon } from "./icons";
import { Spectrum } from "./Spectrum";
import type { NowPlaying } from "./types";
import "./App.css";

const colorReader = new FastAverageColor();
const SPOTIFY_GREEN = "rgb(30, 215, 96)";

function useAccentColor(cover: string | null): string {
  const [accent, setAccent] = useState(SPOTIFY_GREEN);

  useEffect(() => {
    if (cover === null) {
      return;
    }
    colorReader
      .getColorAsync(cover, { algorithm: "dominant" })
      .then((color) => setAccent(color.rgb))
      .catch(() => setAccent(SPOTIFY_GREEN));
  }, [cover]);

  return accent;
}

function useSpin(isPlaying: boolean) {
  const rotation = useMotionValue(0);
  const speed = useRef(0);

  useAnimationFrame((_time, delta) => {
    const targetSpeed = isPlaying ? 1 : 0;
    speed.current = speed.current + (targetSpeed - speed.current) * 0.04;
    rotation.set(rotation.get() + speed.current * delta * 0.045);
  });

  return rotation;
}

function App() {
  const [song, setSong] = useState<NowPlaying | null>(null);

  useEffect(() => window.media.onUpdate(setSong), []);

  const cover = song !== null ? song.cover : null;
  const isPlaying = song !== null && song.isPlaying;
  const accent = useAccentColor(cover);
  const rotation = useSpin(isPlaying);
  const accentStyle = { "--accent": accent } as CSSProperties;

  return (
    <main className="widget" style={accentStyle}>
      <AnimatePresence>
        {cover && (
          <motion.img
            key={cover}
            className="backdrop"
            src={cover}
            alt=""
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
          />
        )}
      </AnimatePresence>

      <Spectrum />

      <section className="deck">
        <motion.div
          className="vinyl"
          animate={{ x: isPlaying ? 42 : 0 }}
          transition={{ type: "spring", stiffness: 110, damping: 17 }}
        >
          <motion.div className="record" style={{ rotate: rotation }}>
            {cover && <img className="label" src={cover} alt="" />}
          </motion.div>
        </motion.div>

        <AnimatePresence mode="popLayout">
          <motion.div
            key={cover ?? "empty"}
            className="sleeve"
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.94 }}
            transition={{ duration: 0.35 }}
          >
            {cover ? <img src={cover} alt="" /> : <Music size={26} />}
          </motion.div>
        </AnimatePresence>
      </section>

      <section className="details">
        <AnimatePresence mode="wait">
          <motion.div
            key={song ? song.title : "nothing"}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25 }}
          >
            <p className="title">
              <DoubleNoteIcon size={15} />
              <span>{song ? song.title : "Nothing playing"}</span>
            </p>
            <p className="artist">
              <StudioMicIcon size={14} />
              <span>{song ? song.artist : "Play music in any app"}</span>
            </p>
          </motion.div>
        </AnimatePresence>

        <div className="controls">
          <motion.button whileTap={{ scale: 0.85 }} aria-label="Previous" onClick={() => window.media.control("previous")}>
            <SkipBack size={16} fill="currentColor" />
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.85 }}
            className="play"
            aria-label="Play or pause"
            onClick={() => window.media.control("toggle")}
          >
            {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
          </motion.button>
          <motion.button whileTap={{ scale: 0.85 }} aria-label="Next" onClick={() => window.media.control("next")}>
            <SkipForward size={16} fill="currentColor" />
          </motion.button>
        </div>
      </section>

      <button className="close" aria-label="Close" onClick={() => window.close()}>
        <X size={12} />
      </button>
    </main>
  );
}

export default App;
