'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/';

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = (await res.json()) as { error?: string; user?: { role?: string } };
      if (!res.ok) throw new Error(data.error || 'Login failed');
      router.replace(next.startsWith('/login') ? '/' : next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center px-4 py-8 safe-area-pad bg-[#060b19]">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-[#00f5d4] text-[#0c1222] flex items-center justify-center text-3xl font-black mb-4">
            F
          </div>
          <h1 className="text-2xl font-bold text-white">FAOS v5.3</h1>
          <p className="text-sm text-slate-400 mt-2">
            Multi-tenant RBAC · Executive Alpha · Team Leads · B2B Clients
          </p>
        </div>

        <form
          onSubmit={(e) => void submit(e)}
          className="rounded-2xl border border-[#2a3548] bg-[#111827] p-6 space-y-4 shadow-xl"
        >
          <div>
            <label htmlFor="username" className="text-xs font-medium text-slate-400 block mb-1.5">
              Username
            </label>
            <input
              id="username"
              type="text"
              autoComplete="username"
              autoCapitalize="none"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="input-faos input-mobile text-base"
              placeholder="fahim"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="text-xs font-medium text-slate-400 block mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-faos input-mobile text-base pr-12"
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? '🙈' : '👁'}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-faos-primary w-full min-h-[48px] text-base"
          >
            {loading ? 'Signing in…' : 'Sign in securely'}
          </button>
        </form>

        <p className="text-[10px] text-slate-600 text-center mt-6 leading-relaxed">
          Role-based access · teammates see assigned sections only ·
          owner credentials in Vercel secrets
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-[100dvh] bg-[#060b19]" />}>
      <LoginForm />
    </Suspense>
  );
}
