'use client';

import { ChatConsole } from '@/components/faos/ChatConsole';

export default function OperationsPage() {
  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-4xl mx-auto space-y-4 safe-area-pad md:pb-8 pb-24">
      <div>
        <h1 className="text-2xl font-bold text-white">Command Center</h1>
        <p className="text-sm text-slate-400 mt-1">
          Voice-to-voice TTS · multimodal attachments · smart model routing. Keys stay server-side.
        </p>
      </div>

      <div className="rounded-xl border border-[#2a3548] bg-[#0c1222] p-3 text-[11px] text-slate-400 grid grid-cols-2 sm:grid-cols-3 gap-2">
        <span>Strategy → Claude</span>
        <span>Code → GPT-4o</span>
        <span>Internal → Gemma / Llama</span>
        <span>Creative → Claude</span>
        <span>Analysis → GPT-4o Mini</span>
        <span>বাংলা → Gemini Flash</span>
      </div>

      <ChatConsole endpoint="chat" title="FAOS Command Console" />
    </div>
  );
}
