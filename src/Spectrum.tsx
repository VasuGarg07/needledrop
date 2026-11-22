import { useEffect, useRef } from "react";

const BAR_COUNT = 64;
const MAX_BAR_HEIGHT = 24;
const MIN_BAR_HEIGHT = 1.5;
const LOWEST_FREQUENCY = 40;
const HIGHEST_FREQUENCY = 16000;
const CONTRAST = 1.25;
const TREBLE_BOOST = 0.6;
const FALL_SPEED = 0.6;

function getBarBinRanges(binCount: number, sampleRate: number) {
  const binWidth = sampleRate / 2 / binCount;
  const frequencyRatio = HIGHEST_FREQUENCY / LOWEST_FREQUENCY;
  const ranges = [];
  for (let index = 0; index < BAR_COUNT; index++) {
    const lowFrequency = LOWEST_FREQUENCY * Math.pow(frequencyRatio, index / BAR_COUNT);
    const highFrequency = LOWEST_FREQUENCY * Math.pow(frequencyRatio, (index + 1) / BAR_COUNT);
    const startBin = Math.floor(lowFrequency / binWidth);
    const endBin = Math.max(startBin + 1, Math.ceil(highFrequency / binWidth));
    ranges.push({ startBin, endBin });
  }
  return ranges;
}

async function openSystemAudio(): Promise<MediaStream> {
  const stream = await navigator.mediaDevices.getDisplayMedia({ audio: true, video: true });
  for (const videoTrack of stream.getVideoTracks()) {
    videoTrack.stop();
  }
  return stream;
}

export function Spectrum() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas === null) {
      return;
    }
    const context = canvas.getContext("2d");
    if (context === null) {
      return;
    }

    let isStopped = false;
    let frameId = 0;
    let stream: MediaStream | null = null;
    let audioContext: AudioContext | null = null;

    openSystemAudio()
      .then((systemStream) => {
        stream = systemStream;
        if (isStopped) {
          systemStream.getTracks().forEach((track) => track.stop());
          return;
        }
        audioContext = new AudioContext();
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 2048;
        analyser.smoothingTimeConstant = 0.3;
        analyser.minDecibels = -85;
        analyser.maxDecibels = -25;
        audioContext.createMediaStreamSource(systemStream).connect(analyser);
        const levels = new Uint8Array(analyser.frequencyBinCount);
        const barRanges = getBarBinRanges(analyser.frequencyBinCount, audioContext.sampleRate);

        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        const pixelRatio = window.devicePixelRatio;
        canvas.width = width * pixelRatio;
        canvas.height = height * pixelRatio;
        context.scale(pixelRatio, pixelRatio);
        context.fillStyle = "rgba(255, 255, 255, 0.6)";
        context.shadowColor = "rgba(255, 255, 255, 0.9)";
        context.shadowBlur = 6;

        const slotWidth = width / BAR_COUNT;
        const barHeights = new Array<number>(BAR_COUNT).fill(MIN_BAR_HEIGHT);

        const draw = () => {
          analyser.getByteFrequencyData(levels);
          context.clearRect(0, 0, width, height);
          for (let index = 0; index < BAR_COUNT; index++) {
            const range = barRanges[index];
            let loudest = 0;
            for (let bin = range.startBin; bin < range.endBin; bin++) {
              loudest = Math.max(loudest, levels[bin]);
            }
            const boost = 1 + TREBLE_BOOST * (index / BAR_COUNT);
            const level = Math.min(1, Math.pow(loudest / 255, CONTRAST) * boost);
            const targetHeight = Math.max(MIN_BAR_HEIGHT, level * MAX_BAR_HEIGHT);
            if (targetHeight > barHeights[index]) {
              barHeights[index] = targetHeight;
            } else {
              barHeights[index] = Math.max(targetHeight, barHeights[index] - FALL_SPEED);
            }
            const barHeight = barHeights[index];
            const x = index * slotWidth + slotWidth / 2 - 1;
            context.fillRect(x, height - barHeight, 2, barHeight);
          }
          frameId = requestAnimationFrame(draw);
        };
        draw();
      })
      .catch(() => {
        isStopped = true;
      });

    return () => {
      isStopped = true;
      cancelAnimationFrame(frameId);
      if (stream !== null) {
        stream.getTracks().forEach((track) => track.stop());
      }
      if (audioContext !== null) {
        audioContext.close();
      }
    };
  }, []);

  return <canvas ref={canvasRef} className="spectrum" aria-hidden="true" />;
}
