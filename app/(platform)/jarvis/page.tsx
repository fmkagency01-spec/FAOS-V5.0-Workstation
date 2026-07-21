'use client';

import { useEffect, useState } from 'react';
import { JarvisPanel } from '@/components/faos/JarvisPanel';
import { getAllShellAgents } from '@/lib/shell-agents';

export default function JarvisPage() {
  const [agents, setAgents] = useState<ReturnType<typeof getAllShellAgents>>([]);

  useEffect(() => {
    setAgents(getAllShellAgents());
  }, []);

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-white">
          JARVIS <span className="text-[#00f5d4]">v5.3</span>
        </h1>
        <p className="text-sm text-slate-400 mt-2 max-w-2xl">
          Executive AI orchestrator — chat, voice-to-voice TTS, multimodal attachments, and
          Super-Admin-only persistent history (survives refresh). Team and clients cannot view
          internal prompt logs.
        </p>
      </div>

      <div className="rounded-2xl border border-[#00f5d4]/20 bg-[#111827] overflow-hidden">
        <JarvisPanel showHistory />
      </div>

      <div>
        <h2 className="text-sm font-bold text-white mb-3">Shell agent network ({agents.length})</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {agents.map((a) => (
            <div
              key={a.id}
              className="rounded-lg border border-[#2a3548] bg-[#0c1222] p-3 text-xs"
            >
              <span className="text-lg">{a.icon}</span>
              <p className="font-semibold text-white mt-1">{a.name}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">{a.domain}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4 text-xs">
        <div className="rounded-xl border border-[#2a3548] bg-[#111827] p-4">
          <p className="font-bold text-[#00f5d4]">Voice</p>
          <p className="text-slate-400 mt-1">Click 🎤 or use Chrome — speak in English or Bengali mix.</p>
        </div>
        <div className="rounded-xl border border-[#2a3548] bg-[#111827] p-4">
          <p className="font-bold text-emerald-400">ERP actions</p>
          <p className="text-slate-400 mt-1">
            &quot;Create invoice for Client X $5000&quot; · &quot;Add stock WIG-SKU-100&quot; · &quot;Hire sales manager&quot;
          </p>
        </div>
        <div className="rounded-xl border border-[#2a3548] bg-[#111827] p-4">
          <p className="font-bold text-amber-400">Creative</p>
          <p className="text-slate-400 mt-1">
            &quot;Generate image for FMK WIG banner&quot; · &quot;Video plan for TikTok reel&quot;
          </p>
        </div>
      </div>
    </div>
  );
}
