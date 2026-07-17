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
};

export function VoiceButton({ onTranscript, disabled, className = '' }: VoiceButtonProps) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    setSupported(Boolean(getSpeechRecognition()));
  }, []);

  const toggle = useCallback(() => {
    const Ctor = getSpeechRecognition();
    if (!Ctor || disabled) return;

    if (listening && recognitionRef.current) {
      recognitionRef.current.stop();
      setListening(false);
      return;
    }

    const rec = new Ctor();
    rec.lang = 'en-US';
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
  }, [disabled, listening, onTranscript]);

  if (!supported) {
    return (
      <span className="text-[9px] text-slate-500" title="Use Chrome for voice">
        🎤 N/A
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={disabled}
      title={listening ? 'Stop listening' : 'Voice command'}
      className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm transition ${
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

export function speakText(text: string, lang = 'en-US') {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text.slice(0, 500));
  utter.lang = lang;
  utter.rate = 1.05;
  window.speechSynthesis.speak(utter);
}
