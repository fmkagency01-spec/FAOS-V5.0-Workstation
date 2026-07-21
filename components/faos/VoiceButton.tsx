'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type SpeechRecognitionCtor = new () => SpeechRecognition;

function getSpeechRecognition(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

type VoiceButtonProps = {
  onTranscript: (text: string) => void;
  disabled?: boolean;
  className?: string;
  /** Recognition language hint — bn-BD for Bengali, en-US default, or auto */
  lang?: 'auto' | 'bn-BD' | 'en-US';
};

export function VoiceButton({
  onTranscript,
  disabled,
  className = '',
  lang = 'auto',
}: VoiceButtonProps) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    setSupported(Boolean(getSpeechRecognition()));
  }, []);

  const resolveLang = useCallback(() => {
    if (lang === 'bn-BD' || lang === 'en-US') return lang;
    // Auto: prefer browser locale when Bengali, else en-US
    const nav = typeof navigator !== 'undefined' ? navigator.language : 'en-US';
    if (nav.toLowerCase().startsWith('bn')) return 'bn-BD';
    return 'en-US';
  }, [lang]);

  const toggle = useCallback(() => {
    const Ctor = getSpeechRecognition();
    if (!Ctor || disabled) return;

    if (listening && recognitionRef.current) {
      recognitionRef.current.stop();
      setListening(false);
      return;
    }

    const rec = new Ctor();
    rec.lang = resolveLang();
    rec.interimResults = false;
    rec.maxAlternatives = 1;

    rec.onresult = (event: SpeechRecognitionEvent) => {
      const text = event.results[0]?.[0]?.transcript?.trim();
      if (text) onTranscript(text);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);

    recognitionRef.current = rec;
    rec.start();
    setListening(true);
  }, [disabled, listening, onTranscript, resolveLang]);

  if (!supported) {
    return (
      <span className="text-[9px] text-slate-500" title="Use Chrome/Edge for voice">
        🎤 N/A
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={disabled}
      title={listening ? 'Stop listening' : 'Voice command (BN/EN)'}
      className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-sm transition touch-manipulation ${
        listening
          ? 'bg-red-500/20 text-red-400 ring-2 ring-red-500/50 animate-pulse'
          : 'bg-[#00f5d4]/10 text-[#00f5d4] hover:bg-[#00f5d4]/20'
      } disabled:opacity-40 ${className}`}
      aria-label="Voice command"
    >
      🎤
    </button>
  );
}

/** @deprecated Prefer `speakText` / `speakIfEnabled` from `@/lib/tts` */
export { speakText, speakIfEnabled, stopSpeaking } from '@/lib/tts';
