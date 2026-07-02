"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Takes an active audio MediaStream and runs an AnalyserNode over it.
 * Exposes a normalized RMS level (0-1) for silence detection, and an
 * array of frequency amplitudes for waveform visualization.
 */
export function useMicAmplitude(stream: MediaStream | null) {
  const [rmsLevel, setRmsLevel] = useState(0);
  const [amplitudes, setAmplitudes] = useState<number[]>([]);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!stream) {
      setRmsLevel(0);
      setAmplitudes([]);
      return;
    }

    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 128;
    const source = audioCtx.createMediaStreamSource(stream);
    source.connect(analyser);

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const update = () => {
      analyser.getByteFrequencyData(dataArray);

      let sum = 0;
      const amps: number[] = [];
      for (let i = 0; i < bufferLength; i++) {
        const val = (dataArray[i] ?? 0) / 255.0; // normalize 0-1
        sum += val * val;
        amps.push(val);
      }
      
      const rms = Math.sqrt(sum / bufferLength);
      setRmsLevel(rms);
      
      // We only need a subset of the bars for the UI (e.g. 44 bars)
      // Since bufferLength is 64, we can just slice or sample.
      setAmplitudes(amps.slice(0, 44));

      frameRef.current = requestAnimationFrame(update);
    };

    update();

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      source.disconnect();
      analyser.disconnect();
      audioCtx.close().catch(() => {});
    };
  }, [stream]);

  return { rmsLevel, amplitudes };
}
