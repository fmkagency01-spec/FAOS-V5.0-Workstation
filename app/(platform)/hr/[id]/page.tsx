'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { PageShell, MsgBanner } from '@/components/faos/erp/PageShell';
import { DetailField, DetailGrid, QuickActions } from '@/components/faos/erp/QuickActions';
import { employeeLinks } from '@/lib/erp-links';
import type { EmployeeRecord } from '@/lib/erp-types';

export default function EmployeeDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const [employee, setEmployee] = useState<EmployeeRecord | null>(null);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    void fetch(`/api/hr/${id}`, { credentials: 'include' })
      .then((r) => r.json())
      .then((d: { employee?: EmployeeRecord; error?: string }) => {
        setEmployee(d.employee || null);
        if (!d.employee) setMsg(d.error || 'Not found');
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-8 text-slate-400">Loading…</div>;
  if (!employee) {
    return (
      <PageShell title="Employee not found" backHref="/hr">
        <MsgBanner msg={msg} error />
      </PageShell>
    );
  }

  return (
    <PageShell title={employee.name} subtitle={`${employee.role} · ${employee.department}`} backHref="/hr" backLabel="← All staff">
      <QuickActions links={employeeLinks()} />

      <DetailGrid>
        <DetailField label="Role" value={employee.role} />
        <DetailField label="Department" value={employee.department} />
        <DetailField label="Email" value={employee.email} />
        <DetailField label="Phone" value={employee.phone} />
        <DetailField label="Status" value={employee.status} />
        <DetailField label="Hire date" value={employee.hire_date} />
        <DetailField label="Notes" value={employee.notes} />
        <DetailField label="ID" value={employee.id} />
      </DetailGrid>
    </PageShell>
  );
}
