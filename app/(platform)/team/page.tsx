'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getAccessPolicyClient, getRoleInfo } from '@/lib/access-client';

type SessionUser = { username: string; name: string; role: string };

export default function TeamPolicyPage() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const policy = getAccessPolicyClient();

  useEffect(() => {
    void fetch('/api/auth/login')
      .then((r) => r.json())
      .then((d: { user?: SessionUser }) => setUser(d.user || null))
      .catch(() => undefined);
  }, []);

  const isOwner = user?.role === 'owner';

  if (user && !isOwner) {
    return (
      <div className="p-6 max-w-lg mx-auto text-center">
        <p className="text-red-400 text-sm">Access denied — owner only</p>
        <Link href="/" className="text-[#00bbf9] text-xs mt-4 inline-block">
          ← Home
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-white">Team & Security Policy</h1>
        <p className="text-sm text-slate-400 mt-1">
          Role-based access — teammates only see their assigned modules. No cross-leak of private data.
        </p>
      </div>

      <div className="rounded-xl border border-[#00f5d4]/20 bg-[#00f5d4]/5 p-4 text-xs text-[#00f5d4]/90">
        <p className="font-bold mb-2">Add teammates (Vercel Environment Variables)</p>
        <pre className="overflow-x-auto text-[10px] bg-[#0c1222] p-3 rounded-lg text-slate-300 whitespace-pre-wrap">
{`FAOS_AUTH_SECRET=your_auth_secret_here
FAOS_AUTH_USERS=[
  {"username":"fahim","password":"your_password_here","name":"Fahim Mahmud Khan","role":"owner"},
  {"username":"sales1","password":"your_password_here","name":"Sales Rep","role":"sales"},
  {"username":"finance1","password":"your_password_here","name":"Finance","role":"finance"}
]`}
        </pre>
        <p className="mt-2 text-slate-400">
          Or set <code className="text-[#00f5d4]">FAOS_OWNER_PASSWORD</code> for single-owner mode
          (exact spelling — not PASSWRD).
        </p>
        <p className="mt-1 text-slate-500">
          After changing the password in Vercel, redeploy the project for login to update.
        </p>
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-bold text-white">Roles</h2>
        {Object.entries(policy.roles).map(([id, role]) => (
          <div key={id} className="rounded-xl border border-[#2a3548] bg-[#111827] p-4">
            <div className="flex justify-between gap-2 flex-wrap">
              <p className="font-semibold text-white">{role.label}</p>
              <span className="text-[10px] font-mono text-slate-500">{id}</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">{role.description}</p>
            <p className="text-[10px] text-[#00f5d4]/70 mt-2">
              Modules: {role.modules.join(', ')}
            </p>
          </div>
        ))}
      </div>

      {user && (
        <p className="text-xs text-slate-500">
          Signed in as {user.name} ({getRoleInfo(user.role).label})
        </p>
      )}
    </div>
  );
}
