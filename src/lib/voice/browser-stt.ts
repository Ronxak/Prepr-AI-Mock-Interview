/** Shared STT recognizer contract used by both the browser and Deepgram backends. */
export interface SttCallbacks {
  onInterim: (text: string) => void;
  onFinal: (segment: string) => void;
  onError: (error: string) => void;
  onOpen?: () => void;
}

export interface SttRecognizer {
  start: () => Promise<void>;
  stop: () => void;
  destroy: () => void;
}

// Minimal local shape for the Web Speech API (not in the TS DOM lib everywhere).
interface BrowserRecognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: BrowserRecognitionEvent) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
}
interface BrowserRecognitionEvent {
  resultIndex: number;
  results: ArrayLike<{
    isFinal: boolean;
    0: { transcript: string };
  }>;
}

function getCtor(): (new () => BrowserRecognition) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => BrowserRecognition;
    webkitSpeechRecognition?: new () => BrowserRecognition;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function isBrowserSttSupported(): boolean {
  return getCtor() !== null;
}

/** Browser SpeechRecognition backend. Auto-restarts across natural pauses. */
export function createBrowserRecognizer(cb: SttCallbacks): SttRecognizer {
  const Ctor = getCtor();
  let rec: BrowserRecognition | null = null;
  let active = false;

  return {
    async start() {
      if (!Ctor) {
        cb.onError("unsupported");
        return;
      }
      active = true;
      rec = new Ctor();
      rec.lang = "en-US";
      rec.continuous = true;
      rec.interimResults = true;
      rec.maxAlternatives = 1;

      rec.onresult = (event) => {
        let interim = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (!result) continue;
          const transcript = result[0]?.transcript ?? "";
          if (result.isFinal) cb.onFinal(transcript.trim());
          else interim += transcript;
        }
        if (interim) cb.onInterim(interim);
      };
      rec.onerror = (event) => {
        const err = event.error ?? "stt-error";
        if (err !== "no-speech" && err !== "aborted") cb.onError(err);
      };
      rec.onend = () => {
        // Keep listening through pauses until explicitly stopped.
        if (active && rec) {
          try {
            rec.start();
          } catch {
            /* already started */
          }
        }
      };

      try {
        rec.start();
        cb.onOpen?.();
      } catch {
        cb.onError("start-failed");
      }
    },
    stop() {
      active = false;
      try {
        rec?.stop();
      } catch {
        /* noop */
      }
    },
    destroy() {
      active = false;
      try {
        rec?.abort();
      } catch {
        /* noop */
      }
      rec = null;
    },
  };
}
