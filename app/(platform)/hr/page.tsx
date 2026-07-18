'use client';

import { useEffect, useState } from 'react';
import { PageShell, MsgBanner } from '@/components/faos/erp/PageShell';
import { RecordLink } from '@/components/faos/erp/RecordLink';
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
    <PageShell title="HR & People" subtitle="Team records — tap for profile & shortcuts.">

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
        {msg && <MsgBanner msg={msg} />}
      </div>

      <div className="space-y-2">
        {employees.map((emp) => (
          <RecordLink
            key={emp.id}
            href={`/hr/${emp.id}`}
            title={emp.name}
            subtitle={`${emp.role} · ${emp.department}`}
            meta={emp.email}
            badge={<span className="text-[10px] uppercase text-emerald-400">{emp.status}</span>}
          />
        ))}
        {employees.length === 0 && <p className="text-sm text-slate-500">No employees yet.</p>}
      </div>
    </PageShell>
  );
}
