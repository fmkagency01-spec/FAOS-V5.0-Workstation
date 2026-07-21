'use client';

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const signOut = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    window.location.href = '/login';
  };

  return (
    <div className="min-h-[100dvh] bg-[#060b19] text-[#e2e8f0]">
      <header className="border-b border-[#1e293b] bg-[#0f172a] px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#9b5de5]">
            Client Portal · Isolated Tenant
          </p>
          <p className="text-sm font-bold text-white mt-0.5">FAOS · BulletsEye Agency Delivery</p>
        </div>
        <button
          type="button"
          onClick={() => void signOut()}
          className="text-xs font-semibold text-slate-300 border border-[#334155] px-3 py-2 rounded-lg hover:bg-[#1e293b]"
        >
          Sign out
        </button>
      </header>
      {children}
    </div>
  );
}
