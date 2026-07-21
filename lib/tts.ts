/**
 * FAOS Web Speech TTS — browser-only Text-to-Speech for voice-to-voice loop.
 * Prefers Bangladeshi Bengali (bn-BD / bn-IN) when script is Bengali; else en-US/en-GB.
 * Keys never leave the client — this uses window.speechSynthesis only.
 */

export type TtsLangMode = "auto" | "bn" | "en";

export type TtsPreferences = {
  enabled: boolean;
  langMode: TtsLangMode;
  rate: number;
};

const STORAGE_KEY = "faos_tts_prefs_v1";

const DEFAULT_PREFS: TtsPreferences = {
  enabled: true,
  langMode: "auto",
  rate: 1.05,
};

export function isTtsSupported(): boolean {
  return typeof window !== "undefined" && Boolean(window.speechSynthesis);
}

export function detectSpeechLang(text: string, mode: TtsLangMode = "auto"): string {
  if (mode === "bn") return "bn-BD";
  if (mode === "en") return "en-US";
  // Auto: Bengali Unicode block → bn-BD, else English
  if (/[\u0980-\u09FF]/.test(text)) return "bn-BD";
  return "en-US";
}

export function loadTtsPreferences(): TtsPreferences {
  if (typeof window === "undefined") return { ...DEFAULT_PREFS };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PREFS };
    const parsed = JSON.parse(raw) as Partial<TtsPreferences>;
    return {
      enabled: parsed.enabled ?? DEFAULT_PREFS.enabled,
      langMode: parsed.langMode ?? DEFAULT_PREFS.langMode,
      rate:
        typeof parsed.rate === "number" && parsed.rate >= 0.7 && parsed.rate <= 1.4
          ? parsed.rate
          : DEFAULT_PREFS.rate,
    };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export function saveTtsPreferences(prefs: TtsPreferences): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}

function pickVoice(lang: string): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;

  const primary = lang.toLowerCase();
  const exact = voices.find((v) => v.lang.toLowerCase() === primary);
  if (exact) return exact;

  const prefix = primary.split("-")[0] || primary;
  const byPrefix = voices.find((v) => v.lang.toLowerCase().startsWith(prefix));
  if (byPrefix) return byPrefix;

  // Soft fallbacks for BD Bengali when only bn-IN is installed
  if (prefix === "bn") {
    return voices.find((v) => v.lang.toLowerCase().startsWith("bn")) || null;
  }
  return voices.find((v) => v.lang.toLowerCase().startsWith("en")) || null;
}

export function stopSpeaking(): void {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
}

/**
 * Speak agent reply aloud. Caps length to keep UX snappy for long strategy dumps.
 */
export function speakText(
  text: string,
  options?: { langMode?: TtsLangMode; rate?: number; maxChars?: number }
): void {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return;

  const maxChars = options?.maxChars ?? 1200;
  const utteranceText = cleaned.slice(0, maxChars);
  const lang = detectSpeechLang(utteranceText, options?.langMode ?? "auto");

  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(utteranceText);
  utter.lang = lang;
  utter.rate = options?.rate ?? 1.05;
  utter.pitch = lang.startsWith("bn") ? 1.0 : 1.02;

  const voice = pickVoice(lang);
  if (voice) utter.voice = voice;

  // Chrome sometimes needs voices loaded asynchronously
  if (!voice && window.speechSynthesis.getVoices().length === 0) {
    window.speechSynthesis.onvoiceschanged = () => {
      const late = pickVoice(lang);
      if (late) utter.voice = late;
      window.speechSynthesis.speak(utter);
      window.speechSynthesis.onvoiceschanged = null;
    };
    // Still attempt immediate speak in case voices are empty forever
    window.setTimeout(() => {
      if (!window.speechSynthesis.speaking && !window.speechSynthesis.pending) {
        window.speechSynthesis.speak(utter);
      }
    }, 250);
    return;
  }

  window.speechSynthesis.speak(utter);
}

export function speakIfEnabled(text: string, prefs?: TtsPreferences): void {
  const p = prefs ?? loadTtsPreferences();
  if (!p.enabled) return;
  speakText(text, { langMode: p.langMode, rate: p.rate });
}
