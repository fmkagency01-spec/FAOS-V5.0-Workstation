'use client';

import { useEffect, useState } from 'react';
import {
  getAllModules,
  loadModulePreferences,
  saveModulePreferences,
  type FaosModule,
  type ModulePreferences,
} from '@/lib/modules-registry';

export default function SettingsPage() {
  const [modules, setModules] = useState<FaosModule[]>([]);
  const [prefs, setPrefs] = useState<ModulePreferences>({});

  useEffect(() => {
    setModules(getAllModules());
    setPrefs(loadModulePreferences());
  }, []);

  const toggle = (id: string, enabled: boolean) => {
    const next = { ...prefs, [id]: enabled };
    setPrefs(next);
    saveModulePreferences(next);
  };

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-sm text-slate-400 mt-1">Enable or disable apps — upgrade sections as you grow.</p>
      </div>

      <div className="rounded-xl border border-[#2a3548] bg-[#111827] p-5">
        <h2 className="text-sm font-bold text-[#00f5d4] mb-4">Installed applications</h2>
        <div className="space-y-3">
          {modules.map((m) => {
            const on = prefs[m.id] ?? m.enabled;
            return (
              <label key={m.id} className="flex items-center justify-between gap-4 p-3 rounded-lg border border-[#2a3548] cursor-pointer hover:bg-white/[0.02]">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{m.icon}</span>
                  <div>
                    <p className="text-sm font-medium text-white">{m.name}</p>
                    <p className="text-[11px] text-slate-500">{m.tier} · {m.description}</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={on}
                  onChange={(e) => toggle(m.id, e.target.checked)}
                  className="w-4 h-4 accent-[#00f5d4]"
                />
              </label>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5 text-sm text-amber-100">
        <p className="font-bold">Token-saving policy (always on)</p>
        <ul className="mt-2 text-xs space-y-1 text-amber-200/80 list-disc pl-4">
          <li>Agents use lean 280-token output cap</li>
          <li>Max 100 OpenRouter calls per day</li>
          <li>Circuit breaker stops loops after 3 tiny responses</li>
          <li>No automatic retry — single-shot commands only</li>
        </ul>
      </div>
    </div>
  );
}
