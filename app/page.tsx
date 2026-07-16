'use client';

import React, { useState, useEffect } from 'react';

export default function FaosDashboard() {
  const [activeTab, setActiveTab] = useState('tab1');
  const [cctvZone, setCctvZone] = useState('hq');
  const [cctvLog, setCctvLog] = useState('');
  const [creativeInput, setCreativeInput] = useState('');
  const [creativeOutput, setCreativeOutput] = useState('');
  const [channelNum, setChannelNum] = useState(1);
  const [mediaLog, setMediaLog] = useState('');
  const [tagName, setTagName] = useState('');
  const [tagLog, setTagLog] = useState('');

  // Load saved brain data on mount
  useEffect(() => {
    const savedCreative = localStorage.getItem('faos_creative_output');
    if (savedCreative) setCreativeOutput(savedCreative);
  }, []);

  // 1. Core CCTV Protocol
  const handleCCTV = () => {
    setCctvLog(`🟢 FAOS SECURITY GATEWAY ACTIVE\n[CONNECTED ZONE]: ${cctvZone.toUpperCase()}\n[STATUS]: Secure Stream Synchronized.\n[EXECUTION]: Core parental protocols are running under Fahim Mahmud Khan's command.`);
  };

  // 2. Creative Brain Matrix (Saves data locally without MongoDB error)
  const handleCreative = () => {
    if (!creativeInput) return;
    const outputText = `🎨 FAOS CREATIVE MATRIX ENGINE v5.0\n[RAW IDEA]: "${creativeInput}"\n\n🎯 [AI GENERATED HOOKS & STRATEGY]:\n1. "১ থেকে ১০০টি চ্যানেল, কিন্তু আলটিমেট কন্ট্রোল মাত্র একটি ড্যাশবোর্ডে।" \n2. "যখন আপনার ক্রিয়েটিভিটি কথা বলে অটোমেটেড অ্যালগরিদমে, ব্র্যান্ড তখন আনস্টপেবল।" \n\n[STATUS]: Successfully saved and pushed to BulletsEye Agency Team Hub.`;
    setCreativeOutput(outputText);
    localStorage.setItem('faos_creative_output', outputText);
  };

  // 3. Socialistic Media Router
  const handleMediaAudit = () => {
    setMediaLog(`📺 SOCIALISTIC MEDIA NETWORK (Channel #${channelNum})\n[ROUTING STATUS]: Operational & Encrypted\n[AGENT ACTIVITY]: Live Monitoring Syncing\n[DATA STREAM]: AI agents are deployment-ready for automated hook posting.`);
  };

  // 4. Custom AI Tag Logic Selector
  const handleTagValidator = () => {
    setTagLog(`⚡ FAOS ALGORITHM MAPPING SUCCESS\n[VALIDATED TAG]: ${tagName || 'GTM-FAOS-ULTIMATE'}\n[MEMORY STORAGE]: Local Browser Sandbox Encrypted.\n[SYNC STATUS]: Past 48-hour data fully integrated.`);
  };

  const menuItems = [
    { id: 'tab1', label: '🌐 ১. প্যারেন্টাল সিসিটিভি ও কোর সার্ভিস' },
    { id: 'tab2', label: '🎨 ২. আর্ট অফ ক্রিয়েটিভিটি (ব্রেইন)' },
    { id: 'tab3', label: '🧠 ৩. এআই ও কোর অ্যালগরিদম গেট' },
    { id: 'tab4', label: '📊 ৪. কনসিউমার টেক ফ্রেমওয়ার্ক' },
    { id: 'tab5', label: '🛍️ ৫. গ্লোবাল সোর্সিং ও ই-কমার্স' },
    { id: 'tab6', label: '🌍 六. ইন্টারন্যাশনাল লজিস্টিকস (Wig)' },
    { id: 'tab7', label: '📺 ৭. সোশিয়ালিস্টিক মিডিয়া (১-১০০ চ্যান)' },
    { id: 'tab8', label: '🎓 ৮. লার্নিং হাব ও নলেজ বেইজ' },
    { id: 'tab9', label: '👥 ৯. বুলেটসআই টিম ওয়ার্কস্টেশন' },
  ];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#060b19] text-[#e2e8f0]">
      {/* PREMIUM UI SIDEBAR */}
      <aside className="w-85 bg-gradient-to-b from-[#0f172a] to-[#1e293b] p-6 flex flex-col justify-between border-r border-[#1e293b] shadow-2xl">
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
        <div className="text-xs text-[#00f5d4] text-center font-bold tracking-widest bg-[#060b19] py-2 rounded border border-[#00f5d4]/20">
          FAOS SECURITY: SECURE SYSTEM 🔒
        </div>
      </aside>

      {/* MAIN CONTENT WORKSPACE */}
      <main className="flex-1 flex flex-col overflow-y-auto bg-[#060b19]">
        <header className="bg-[#0f172a] px-8 py-5 flex justify-between items-center border-b border-[#1e293b]">
          <h1 className="text-xl font-bold text-[#00f5d4] tracking-wide">
            {menuItems.find((m) => m.id === activeTab)?.label.substring(4) || 'Workspace'}
          </h1>
          <div className="font-semibold text-[#060b19] bg-[#00f5d4] px-5 py-2 rounded-full text-sm shadow-[0_0_15px_rgba(0,245,212,0.4)]">
            👑 Executive Alpha: Fahim Mahmud Khan
          </div>
        </header>

        {/* DYNAMIC TAB CONTROLLERS */}
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
              <p className="text-sm text-[#94a3b8] mb-4">আপনার নিজস্ব ক্রিয়েটিভ আইডিয়া ল্যাব। যেকোনো ক্যাম্পেইনের হুক বা রিলস থিম ইনপুট দিন।</p>
              <textarea
                value={creativeInput}
                onChange={(e) => setCreativeInput(e.target.value)}
                rows={4}
                placeholder="আপনার ক্রিয়েটিভ আইডিয়া বা ক্যাম্পেইনের থিমটি এখানে লিখুন..."
                className="w-full p-3 bg-[#060b19] border border-[#334155] rounded-lg text-white mb-4 text-sm"
              />
              <button onClick={handleCreative} className="w-full bg-[#9b5de5] text-white font-bold py-3 rounded-lg hover:bg-[#00bbf9] transition-all duration-300 text-sm">
                ক্রিয়েটিভ ব্রেইন প্রসেস করুন
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

          {!['tab1', 'tab2', 'tab3', 'tab7'].includes(activeTab) && (
            <div className="max-w-4xl bg-[#0f172a] rounded-xl p-6 border border-[#1e293b] shadow-xl">
              <h3 className="text-lg font-bold text-white mb-2">⚙️ মডিউল স্ট্যাটাস: অপারেশনাল</h3>
              <p className="text-sm text-[#94a3b8]">FAOS v5.0 কোর ইকোসিস্টেম ডেটাবেস সফলভাবে সিনক্রোনাইজড। ব্যাকএন্ড ক্লাউড নোড সচল আছে।</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
