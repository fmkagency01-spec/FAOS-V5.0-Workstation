'use client';

import { useEffect, useState } from 'react';
import type { EmployeeRecord } from '@/lib/erp-types';

export default function HrPage() {
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [form, setForm] = useState({
    name: '',
    role: '',
    department: '',
    email: '',
    phone: '',
  });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const load = async () => {
    const res = await fetch('/api/hr', { cache: 'no-store' });
    const data = (await res.json()) as { employees?: EmployeeRecord[] };
    setEmployees(data.employees || []);
  };

  useEffect(() => {
    void load();
  }, []);

  const submit = async () => {
    if (!form.name.trim()) return;
    setLoading(true);
    setMsg('');
    try {
      const res = await fetch('/api/hr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = (await res.json()) as { source?: string; error?: string };
      if (!res.ok) throw new Error(data.error || 'Failed');
      setMsg(`Employee added (${data.source})`);
      setForm({ name: '', role: '', department: '', email: '', phone: '' });
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">HR & People</h1>
        <p className="text-sm text-slate-400 mt-1">Team records — JARVIS: &quot;Hire sales manager for FMK WIG&quot;</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div className="rounded-lg border border-[#2a3548] bg-[#111827] p-4">
          <p className="text-[10px] uppercase text-slate-500">Active staff</p>
          <p className="text-2xl font-bold text-white mt-1">
            {employees.filter((e) => e.status === 'active').length}
          </p>
        </div>
        <div className="rounded-lg border border-[#2a3548] bg-[#111827] p-4">
          <p className="text-[10px] uppercase text-slate-500">Departments</p>
          <p className="text-2xl font-bold text-white mt-1">
            {new Set(employees.map((e) => e.department)).size}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-[#2a3548] bg-[#111827] p-5 space-y-3">
        <h2 className="text-sm font-bold text-[#00f5d4]">Add employee</h2>
        <div className="grid md:grid-cols-2 gap-3">
          <input className="input-faos" placeholder="Full name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className="input-faos" placeholder="Role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} />
          <input className="input-faos" placeholder="Department" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
          <input className="input-faos" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input className="input-faos md:col-span-2" placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>
        <button type="button" onClick={() => void submit()} disabled={loading} className="btn-faos-primary">
          {loading ? 'Saving…' : 'Add employee'}
        </button>
        {msg && <p className="text-xs text-slate-400">{msg}</p>}
      </div>

      <div className="space-y-2">
        {employees.map((emp) => (
          <div key={emp.id} className="rounded-lg border border-[#2a3548] bg-[#111827] p-4 flex justify-between gap-4">
            <div>
              <p className="font-semibold text-white">{emp.name}</p>
              <p className="text-xs text-slate-400">
                {emp.role} · {emp.department}
              </p>
              <p className="text-[10px] text-slate-600">{emp.email}</p>
            </div>
            <span className="text-xs uppercase text-emerald-400 h-fit">{emp.status}</span>
          </div>
        ))}
        {employees.length === 0 && <p className="text-sm text-slate-500">No employees yet.</p>}
      </div>
    </div>
  );
}
