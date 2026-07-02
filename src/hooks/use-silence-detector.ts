"use client";

import { useEffect, useRef, useState } from "react";

export interface UseSilenceDetectorOptions {
  rmsThreshold?: number;
  silenceDurationMs?: number;
  onSilence?: () => void;
  enabled?: boolean;
}

/**
 * Monitors RMS volume and triggers onSilence if volume stays below
 * a threshold for a set duration.
 */
export function useSilenceDetector(
  rmsLevel: number,
  options: UseSilenceDetectorOptions = {}
) {
  const {
    rmsThreshold = 0.015,
    silenceDurationMs = 3000,
    onSilence,
    enabled = true,
  } = options;

  const [silenceProgress, setSilenceProgress] = useState(0);
  const silenceStartRef = useRef<number | null>(null);
  const frameRef = useRef<number | null>(null);
  
  // Need the latest callback without re-triggering effects
  const onSilenceRef = useRef(onSilence);
  useEffect(() => {
    onSilenceRef.current = onSilence;
  }, [onSilence]);

  useEffect(() => {
    if (!enabled) {
      setSilenceProgress(0);
      silenceStartRef.current = null;
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      return;
    }

    if (rmsLevel > rmsThreshold) {
      // Noise detected, reset silence timer
      silenceStartRef.current = null;
      setSilenceProgress(0);
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    } else {
      // Silence detected, start/continue timer
      if (!silenceStartRef.current) {
        silenceStartRef.current = performance.now();
        
        const updateProgress = () => {
          if (!silenceStartRef.current) return; // aborted
          
          const elapsed = performance.now() - silenceStartRef.current;
          const progress = Math.min(elapsed / silenceDurationMs, 1);
          setSilenceProgress(progress);
          
          if (progress >= 1) {
            onSilenceRef.current?.();
            silenceStartRef.current = null; // trigger only once per silence block
          } else {
            frameRef.current = requestAnimationFrame(updateProgress);
          }
        };
        
        frameRef.current = requestAnimationFrame(updateProgress);
      }
    }
  }, [rmsLevel, rmsThreshold, silenceDurationMs, enabled]);

  return { silenceProgress };
}
