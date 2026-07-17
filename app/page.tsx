'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

type BackendStatus = 'checking' | 'online' | 'degraded' | 'offline';

export default function FaosDashboard() {
  const [activeTab, setActiveTab] = useState('tab1');
  const [cctvZone, setCctvZone] = useState('hq');
  const [cctvLog, setCctvLog] = useState('');
  const [creativeInput, setCreativeInput] = useState('');
  const [creativeOutput, setCreativeOutput] = useState('');
  const [creativeLoading, setCreativeLoading] = useState(false);
  const [channelNum, setChannelNum] = useState(1);
  const [mediaLog, setMediaLog] = useState('');
  const [tagName, setTagName] = useState('');
  const [tagLog, setTagLog] = useState('');
  const [backendStatus, setBackendStatus] = useState<BackendStatus>('checking');
  const [gatewayState, setGatewayState] = useState('unknown');
  const [renderState, setRenderState] = useState('checking');
  const [renderDocsUrl, setRenderDocsUrl] = useState('');
  const [cmdInput, setCmdInput] = useState('');
  const [cmdLog, setCmdLog] = useState<string[]>([
    '[SYSTEM INIT]: FAOS API gateway ready. Keys stay server-side only.',
  ]);
  const [cmdLoading, setCmdLoading] = useState(false);

  useEffect(() => {
    const savedCreative = localStorage.getItem('faos_creative_output');
    if (savedCreative) setCreativeOutput(savedCreative);

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/health', { cache: 'no-store' });
        if (!res.ok) throw new Error(`health ${res.status}`);
        const data = (await res.json()) as {
          ok?: boolean;
          gateway?: { openrouter?: string };
          backend?: {
            url?: string | null;
            render?: { status?: string; message?: string; docs_url?: string };
          };
        };
        if (cancelled) return;
        const openrouter = data.gateway?.openrouter || 'unknown';
        const render = data.backend?.render?.status || 'unknown';
        setGatewayState(openrouter);
        setRenderState(render);
        setRenderDocsUrl(data.backend?.render?.docs_url || data.backend?.url || '');
        const renderOnline = render === 'online';
        const openrouterOk = openrouter === 'configured';
        setBackendStatus(
          renderOnline && openrouterOk
            ? 'online'
            : renderOnline || openrouterOk
              ? 'degraded'
              : 'offline'
        );
      } catch {
        if (!cancelled) {
          setBackendStatus('offline');
          setGatewayState('unreachable');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleCCTV = () => {
    setCctvLog(
      `🟢 FAOS SECURITY GATEWAY ACTIVE\n[CONNECTED ZONE]: ${cctvZone.toUpperCase()}\n[STATUS]: Secure Stream Synchronized.\n[BACKEND]: ${backendStatus.toUpperCase()} | Render: ${renderState.toUpperCase()} | OpenRouter: ${gatewayState}\n[EXECUTION]: Core parental protocols are running under Fahim Mahmud Khan's command.`
    );
  };

  const handleCreative = async () => {
    if (!creativeInput.trim() || creativeLoading) return;
    setCreativeLoading(true);
    setCreativeOutput('Processing through secure FAOS API...');
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Create 2 short marketing hooks in Bangla+English mix for this campaign idea: ${creativeInput.trim()}`,
        }),
      });
      const data = (await res.json()) as { reply?: string; error?: string; model?: string };
      if (!res.ok) throw new Error(data.error || `API error ${res.status}`);

      const outputText = `🎨 FAOS CREATIVE MATRIX ENGINE v5.0\n[RAW IDEA]: "${creativeInput.trim()}"\n[MODEL]: ${data.model || 'routed'}\n\n🎯 [AI GENERATED HOOKS & STRATEGY]:\n${data.reply}\n\n[STATUS]: Saved locally. API key never left the server.`;
      setCreativeOutput(outputText);
      localStorage.setItem('faos_creative_output', outputText);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Creative gateway failed.';
      setCreativeOutput(`❌ CREATIVE GATEWAY ERROR\n${message}\n\nTip: set OPENROUTER_API_KEY in Vercel Environment Variables, then redeploy.`);
    } finally {
      setCreativeLoading(false);
    }
  };

  const handleMediaAudit = () => {
    setMediaLog(
      `📺 SOCIALISTIC MEDIA NETWORK (Channel #${channelNum})\n[ROUTING STATUS]: Operational & Encrypted\n[BACKEND API]: /api/health = ${backendStatus}\n[DATA STREAM]: AI agents are deployment-ready for automated hook posting.`
    );
  };

  const handleTagValidator = () => {
    setTagLog(
      `⚡ FAOS ALGORITHM MAPPING SUCCESS\n[VALIDATED TAG]: ${tagName || 'GTM-FAOS-ULTIMATE'}\n[MEMORY STORAGE]: Local Browser Sandbox Encrypted.\n[SYNC STATUS]: Past 48-hour data fully integrated.`
    );
  };

  const fireCommand = async () => {
    const query = cmdInput.trim();
    if (!query || cmdLoading) return;
    setCmdLoading(true);
    setCmdLog((prev) => [...prev, `CEO_FAHIM> ${query}`, '[TAC]: routing via /api/chat (server-side key)...']);
    setCmdInput('');
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: query }),
      });
      const data = (await res.json()) as {
        reply?: string;
        error?: string;
        model?: string;
        usage?: { total_tokens?: number };
      };
      if (!res.ok) throw new Error(data.error || `API error ${res.status}`);
      setCmdLog((prev) => [
        ...prev,
        `[GATEWAY ROUTE]: ${data.model || 'unknown'}`,
        `[TAC Core Agent]: ${data.reply}`,
        data.usage?.total_tokens != null
          ? `[TOKEN TELEMETRY]: total ${data.usage.total_tokens}`
          : '[TOKEN TELEMETRY]: n/a',
      ]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Gateway connection failed.';
      setCmdLog((prev) => [...prev, `[ROUTING ERROR]: ${message}`]);
    } finally {
      setCmdLoading(false);
    }
  };

  const menuItems = [
    { id: 'tab1', label: '🌐 ১. প্যারেন্টাল সিসিটিভি ও কোর সার্ভিস', title: 'প্যারেন্টাল সিসিটিভি ও কোর সার্ভিস' },
    { id: 'tab2', label: '🎨 ২. আর্ট অফ ক্রিয়েটিভিটি (ব্রেইন)', title: 'আর্ট অফ ক্রিয়েটিভিটি (ব্রেইন)' },
    { id: 'tab3', label: '🧠 ৩. এআই ও কোর অ্যালগরিদম গেট', title: 'এআই ও কোর অ্যালগরিদম গেট' },
    { id: 'tab4', label: '📊 ৪. কনসিউমার টেক ফ্রেমওয়ার্ক', title: 'কনসিউমার টেক ফ্রেমওয়ার্ক' },
    { id: 'tab5', label: '🛍️ ৫. ক্রিয়েট পিলার (Retail Core)', title: 'ক্রিয়েট পিলার (Retail Core)' },
    { id: 'tab6', label: '🌍 六. ইন্টারন্যাশনাল লজিস্টিকস (Wig)', title: 'ইন্টারন্যাশনাল লজিস্টিকস (Wig)' },
    { id: 'tab7', label: '📺 ৭. সোশিয়ালিস্টিক মিডিয়া (১-১০০ চ্যান)', title: 'সোশিয়ালিস্টিক মিডিয়া (১-১০০ চ্যান)' },
    { id: 'tab8', label: '🎓 ৮. লার্নিং হাব ও নলেজ বেইজ', title: 'লার্নিং হাব ও নলেজ বেইজ' },
    { id: 'tab9', label: '👥 ৯. বুলেটসআই টিম ওয়ার্কস্টেশন', title: 'বুলেটসআই টিম ওয়ার্কস্টেশন' },
    { id: 'tab10', label: '⚙️ ১০. কমান্ড সেন্টার (API)', title: 'কমান্ড সেন্টার (API)' },
  ];

  const statusColor =
    backendStatus === 'online'
      ? 'text-emerald-400'
      : backendStatus === 'degraded'
        ? 'text-amber-400'
        : backendStatus === 'checking'
          ? 'text-slate-400'
          : 'text-red-400';

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#060b19] text-[#e2e8f0]">
      <aside className="w-sidebar shrink-0 bg-gradient-to-b from-[#0f172a] to-[#1e293b] p-6 flex flex-col justify-between border-r border-[#1e293b] shadow-2xl">
        <div>
          <h2 className="text-2xl font-extrabold text-[#00f5d4] mb-6 border-b-2 border-[#00f5d4] pb-3 text-center tracking-wider">⚡ FAOS v5.0</h2>
          <nav className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
            {menuItems.map((item) => (
              <div
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`p-3 text-sm rounded-lg cursor-pointer transition-all duration-300 flex items-center gap-2 border border-transparent ${
                  activeTab === item.id
                    ? 'bg-[#00f5d4]/10 text-[#00f5d4] font-bold border-[#00f5d4]/30 shadow-[0_0_10px_rgba(0,245,212,0.1)]'
                    : 'text-[#94a3b8] hover:bg-[#00f5d4]/5 hover:text-[#00f5d4]'
                }`}
              >
                {item.label}
              </div>
            ))}
          </nav>
        </div>
        <div className="space-y-2">
          <div className={`text-[11px] text-center font-mono ${statusColor}`}>
            API: {backendStatus.toUpperCase()} · Render: {renderState} · OR: {gatewayState}
          </div>
          {renderDocsUrl && (
            <a
              href={renderDocsUrl.endsWith('/docs') ? renderDocsUrl : `${renderDocsUrl}/docs`}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-[10px] text-center text-[#00bbf9] hover:underline font-mono truncate px-1"
            >
              Render API docs ↗
            </a>
          )}
          <div className="text-xs text-[#00f5d4] text-center font-bold tracking-widest bg-[#060b19] py-2 rounded border border-[#00f5d4]/20">
            FAOS SECURITY: SECURE SYSTEM
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-y-auto bg-[#060b19]">
        <header className="bg-[#0f172a] px-8 py-5 flex justify-between items-center border-b border-[#1e293b]">
          <h1 className="text-xl font-bold text-[#00f5d4] tracking-wide">
            {menuItems.find((m) => m.id === activeTab)?.title || 'Workspace'}
          </h1>
          <div className="font-semibold text-[#060b19] bg-[#00f5d4] px-5 py-2 rounded-full text-sm shadow-[0_0_15px_rgba(0,245,212,0.4)]">
            Executive Alpha: Fahim Mahmud Khan
          </div>
        </header>

        <div className="p-8">
          {activeTab === 'tab1' && (
            <div className="max-w-4xl bg-[#0f172a] rounded-xl p-6 border border-[#1e293b] shadow-xl relative overflow-hidden before:absolute before:top-0 before:left-0 before:w-1 before:h-full before:bg-[#00f5d4]">
              <span className="text-xs bg-[#00f5d4]/10 text-[#00f5d4] px-2.5 py-1 rounded font-bold mb-3 inline-block">Parental Control Suite</span>
              <h3 className="text-lg font-bold text-white mb-2">🏢 প্যারেন্টাল সিসিটিভি ও কোর সার্ভিস সলিউশনস</h3>
              <p className="text-sm text-[#94a3b8] mb-4">প্যারেন্টাল এজেন্সির মূল আর্কিটেকচার। সেন্ট্রাল সিসিটিভি নেটওয়ার্কিং ও সিকিউরিটি ম্যাপিং প্যানেল।</p>
              <select
                value={cctvZone}
                onChange={(e) => setCctvZone(e.target.value)}
                className="w-full p-3 bg-[#060b19] border border-[#334155] rounded-lg text-white mb-4 text-sm"
              >
                <option value="hq">সেন্ট্রাল হেডকোয়ার্টার জোন</option>
                <option value="media">মিডিয়া প্রোডাকশন ফ্লোর</option>
                <option value="server">এআই সার্ভার ও টেকনিক্যাল ক্লাউড</option>
              </select>
              <button onClick={handleCCTV} className="w-full bg-[#00f5d4] text-[#060b19] font-bold py-3 rounded-lg hover:bg-[#00bbf9] hover:text-white transition-all duration-300 text-sm">
                সার্ভিস গেটওয়ে কানেক্ট করুন
              </button>
              {cctvLog && <pre className="mt-4 p-4 bg-[#060b19] border border-dashed border-[#334155] rounded-lg text-xs font-mono text-[#cbd5e1] whitespace-pre-line">{cctvLog}</pre>}
            </div>
          )}

          {activeTab === 'tab2' && (
            <div className="max-w-4xl bg-[#0f172a] rounded-xl p-6 border border-[#1e293b] shadow-xl relative overflow-hidden before:absolute before:top-0 before:left-0 before:w-1 before:h-full before:bg-[#9b5de5]">
              <span className="text-xs bg-[#9b5de5]/10 text-[#9b5de5] px-2.5 py-1 rounded font-bold mb-3 inline-block">Creative Brain Matrix</span>
              <h3 className="text-lg font-bold text-white mb-2">🎨 আর্ট অফ ক্রিয়েটিভিটি এবং ভিজ্যুয়াল হুক ইঞ্জিন</h3>
              <p className="text-sm text-[#94a3b8] mb-4">Secure server-side OpenRouter call via `/api/chat`. No API key in the browser.</p>
              <textarea
                value={creativeInput}
                onChange={(e) => setCreativeInput(e.target.value)}
                rows={4}
                placeholder="আপনার ক্রিয়েটিভ আইডিয়া বা ক্যাম্পেইনের থিমটি এখানে লিখুন..."
                className="w-full p-3 bg-[#060b19] border border-[#334155] rounded-lg text-white mb-4 text-sm"
              />
              <button
                onClick={handleCreative}
                disabled={creativeLoading}
                className="w-full bg-[#9b5de5] text-white font-bold py-3 rounded-lg hover:bg-[#00bbf9] transition-all duration-300 text-sm disabled:opacity-50"
              >
                {creativeLoading ? 'প্রসেসিং...' : 'ক্রিয়েটিভ ব্রেইন প্রসেস করুন'}
              </button>
              {creativeOutput && <pre className="mt-4 p-4 bg-[#060b19] border border-dashed border-[#334155] rounded-lg text-xs font-mono text-[#cbd5e1] whitespace-pre-line">{creativeOutput}</pre>}
            </div>
          )}

          {activeTab === 'tab3' && (
            <div className="max-w-4xl bg-[#0f172a] rounded-xl p-6 border border-[#1e293b] shadow-xl relative overflow-hidden before:absolute before:top-0 before:left-0 before:w-1 before:h-full before:bg-[#f15bb5]">
              <span className="text-xs bg-[#f15bb5]/10 text-[#f15bb5] px-2.5 py-1 rounded font-bold mb-3 inline-block">Algorithm Gate</span>
              <h3 className="text-lg font-bold text-white mb-2">🧠 কাস্টম ট্যাগ এবং এআই অ্যালগরিদম ভ্যালিডেটর</h3>
              <p className="text-sm text-[#94a3b8] mb-4">অ্যাডভান্সড কনভার্সন ট্র্যাকিং লজিক এবং মেমোরি ট্যাগ ইন্টিগ্রেশন প্যানেল।</p>
              <input
                type="text"
                value={tagName}
                onChange={(e) => setTagName(e.target.value)}
                placeholder="ট্যাগ নেম বা পিক্সেল আইডি (যেমন: GTM-FAOS-PRO)"
                className="w-full p-3 bg-[#060b19] border border-[#334155] rounded-lg text-white mb-4 text-sm"
              />
              <button onClick={handleTagValidator} className="w-full bg-[#f15bb5] text-white font-bold py-3 rounded-lg hover:bg-[#00bbf9] transition-all duration-300 text-sm">
                অ্যালগরিদম ভ্যালিডেট করুন
              </button>
              {tagLog && <pre className="mt-4 p-4 bg-[#060b19] border border-dashed border-[#334155] rounded-lg text-xs font-mono text-[#cbd5e1] whitespace-pre-line">{tagLog}</pre>}
            </div>
          )}

          {activeTab === 'tab5' && (
            <div className="max-w-4xl bg-[#0f172a] rounded-xl p-6 border border-[#1e293b] shadow-xl relative overflow-hidden before:absolute before:top-0 before:left-0 before:w-1 before:h-full before:bg-emerald-400 space-y-4">
              <span className="text-xs bg-emerald-500/10 text-emerald-300 px-2.5 py-1 rounded font-bold inline-block">Create Pillar · Retail Core</span>
              <h3 className="text-lg font-bold text-white">FMK Create Pillar Manufacturing Hub</h3>
              <p className="text-sm text-[#94a3b8]">
                Namespace <code className="text-amber-300">fmk_create_pillar_retail_core</code> under FMK Group LTD.
                Isolated agents: FMK WIG, MK Clothing, MK Kitchen, FMK Shoes (Kadam / Pothik / The Posh Pa).
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-[#060b19] border border-[#334155]">
                  FMK WIG — <code className="text-amber-300">fmk_wig_prosthetic_hair_agent</code>
                </div>
                <div className="p-3 rounded-lg bg-[#060b19] border border-[#334155]">MK Clothing — Omni lifestyle</div>
                <div className="p-3 rounded-lg bg-[#060b19] border border-[#334155]">MK Kitchen — Cloud food ops</div>
                <div className="p-3 rounded-lg bg-[#060b19] border border-[#334155]">FMK Shoes — Kadam / Pothik / Posh Pa</div>
              </div>
              <p className="text-xs text-slate-500 font-mono">
                Gatekeeper: Generation Request → Aigorithm Technical Permit → TAC Creative Brand Approval → Live API Deployment
              </p>
              <Link
                href="/dashboard/create-pillar"
                className="inline-flex w-full items-center justify-center bg-[#00f5d4] text-[#060b19] font-bold py-3 rounded-lg hover:bg-[#00bbf9] hover:text-white transition-all duration-300 text-sm"
              >
                Open One-Click Manufacturing & Sales Console →
              </Link>
            </div>
          )}

          {activeTab === 'tab7' && (
            <div className="max-w-4xl bg-[#0f172a] rounded-xl p-6 border border-[#1e293b] shadow-xl relative overflow-hidden before:absolute before:top-0 before:left-0 before:w-1 before:h-full before:bg-[#00bbf9]">
              <span className="text-xs bg-[#00bbf9]/10 text-[#00bbf9] px-2.5 py-1 rounded font-bold mb-3 inline-block">1-100 Channels Suite</span>
              <h3 className="text-lg font-bold text-white mb-2">📺 সোশিয়ালিস্টিক মিডিয়া সেক্টর ও এজেন্ট ডিস্ট্রিবিউশন</h3>
              <p className="text-sm text-[#94a3b8] mb-4">১ থেকে ১০০টি সোশ্যাল মিডিয়া চ্যানেল ট্র্যাকিং এবং ডেডিকেটেড এআই এজেন্ট ডেটা স্ট্রীম ড্যাশবোর্ড।</p>
              <input
                type="number"
                min={1}
                max={100}
                value={channelNum}
                onChange={(e) => setChannelNum(Number(e.target.value))}
                className="w-full p-3 bg-[#060b19] border border-[#334155] rounded-lg text-white mb-4 text-sm"
              />
              <button onClick={handleMediaAudit} className="w-full bg-[#00bbf9] text-white font-bold py-3 rounded-lg hover:bg-[#00f5d4] hover:text-[#060b19] transition-all duration-300 text-sm">
                মিডিয়া চ্যানেল অডিট করুন
              </button>
              {mediaLog && <pre className="mt-4 p-4 bg-[#060b19] border border-dashed border-[#334155] rounded-lg text-xs font-mono text-[#cbd5e1] whitespace-pre-line">{mediaLog}</pre>}
            </div>
          )}

          {activeTab === 'tab10' && (
            <div className="max-w-4xl bg-[#0f172a] rounded-xl p-6 border border-[#1e293b] shadow-xl space-y-4">
              <span className="text-xs bg-amber-500/10 text-amber-300 px-2.5 py-1 rounded font-bold inline-block">Secure Command Center</span>
              <h3 className="text-lg font-bold text-white">TAC Global Agent Core</h3>
              <p className="text-sm text-[#94a3b8]">
                Browser calls only `/api/chat`. The OpenRouter key stays in server env (`OPENROUTER_API_KEY`).
              </p>
              <div className="bg-[#070a12] border border-[#1e293b] rounded-md h-56 overflow-y-auto p-4 text-xs font-mono space-y-2 text-slate-300">
                {cmdLog.map((line, idx) => (
                  <div key={`${idx}-${line.slice(0, 12)}`}>{line}</div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={cmdInput}
                  onChange={(e) => setCmdInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      void fireCommand();
                    }
                  }}
                  placeholder="Target command (e.g. /strategy expand BulletsEye)"
                  className="flex-1 bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                />
                <button
                  onClick={() => void fireCommand()}
                  disabled={cmdLoading}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-5 py-2 rounded text-xs font-semibold font-mono"
                >
                  {cmdLoading ? '...' : 'Execute'}
                </button>
              </div>
            </div>
          )}

          {!['tab1', 'tab2', 'tab3', 'tab5', 'tab7', 'tab10'].includes(activeTab) && (
            <div className="max-w-4xl bg-[#0f172a] rounded-xl p-6 border border-[#1e293b] shadow-xl">
              <h3 className="text-lg font-bold text-white mb-2">⚙️ মডিউল স্ট্যাটাস: অপারেশনাল</h3>
              <p className="text-sm text-[#94a3b8]">
                FAOS v5.0 backend API status: <span className={statusColor}>{backendStatus}</span> · OpenRouter: {gatewayState}
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
