'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

type EntityOption = {
  id: string;
  brand_name: string;
  route_key: string;
  scope: string;
  sub_categories?: Record<string, string>;
};

type ProcessResult = Record<string, unknown>;

export default function ManufacturingConsole() {
  const [entities, setEntities] = useState<EntityOption[]>([]);
  const [selectedBrand, setSelectedBrand] = useState('fmk_wig_prosthetic_hair_agent');
  const [requestType, setRequestType] = useState('Production_Request');
  const [skuInput, setSkuInput] = useState('{"sku":"WIG-PRO-01","units":40}');
  const [isApproved, setIsApproved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [telemetry, setTelemetry] = useState<string>('Awaiting Create Pillar sync...');
  const [processResult, setProcessResult] = useState<ProcessResult | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/create-pillar', { cache: 'no-store' });
        const data = (await res.json()) as {
          entities?: EntityOption[] | Record<string, Omit<EntityOption, 'id'>>;
          parent_hub?: string;
          error?: string;
        };
        if (!res.ok) throw new Error(data.error || `API ${res.status}`);
        if (cancelled) return;

        const normalized: EntityOption[] = Array.isArray(data.entities)
          ? data.entities
          : Object.entries(data.entities || {}).map(([id, meta]) => ({
              id,
              brand_name: meta.brand_name,
              route_key: meta.route_key,
              scope: meta.scope,
              sub_categories: meta.sub_categories,
            }));

        setEntities(normalized);
        setTelemetry(
          `Namespace locked: fmk_create_pillar_retail_core · FMK WIG = fmk_wig_prosthetic_hair_agent · Parent hub: ${data.parent_hub || 'FMK'}`
        );
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load Create Pillar namespace');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedMeta = entities.find((e) => e.id === selectedBrand);

  const runProcess = async () => {
    setLoading(true);
    setError('');
    try {
      let sku_details: Record<string, unknown> = {};
      try {
        sku_details = JSON.parse(skuInput) as Record<string, unknown>;
      } catch {
        throw new Error('SKU details must be valid JSON.');
      }

      const res = await fetch('/api/create-pillar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'process',
          target_brand: selectedBrand,
          request_type: requestType,
          sku_details,
        }),
      });
      const data = (await res.json()) as ProcessResult & { error?: string };
      if (!res.ok) throw new Error(data.error || `Process failed (${res.status})`);
      setProcessResult(data);
      setTelemetry(
        `Processed ${String(data.target_node)} · Gatekeeper: ${String(data.gatekeeper_verification)} · Memory isolated`
      );
      setIsApproved(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Process failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGatekeeperAction = async () => {
    setLoading(true);
    setError('');
    try {
      // Ensure a process pass exists before TAC live approval.
      if (!processResult) {
        await runProcess();
      }

      const res = await fetch('/api/create-pillar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'gatekeeper',
          target_brand: selectedBrand,
          request_type: requestType,
        }),
      });
      const data = (await res.json()) as {
        approved?: boolean;
        deployment_state?: string;
        flow?: string[];
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || `Gatekeeper failed (${res.status})`);

      setIsApproved(Boolean(data.approved));
      setTelemetry(
        data.approved
          ? `Gatekeeper LIVE · ${selectedBrand} · Flow: ${(data.flow || []).join(' → ')}`
          : 'Gatekeeper BLOCKED — TAC approval required'
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gatekeeper failed');
      setIsApproved(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#060b19] text-[#e2e8f0]">
      <header className="border-b border-[#1e293b] bg-[#0f172a] px-6 py-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-[#00f5d4]">FAOS v5.0 · Create Pillar</p>
          <h1 className="text-2xl font-extrabold text-white mt-1">Manufacturing & Sales Matrix</h1>
          <p className="text-sm text-slate-400 mt-1">
            FMK Group LTD · Parent Anchor: fmk_parent_manufacturing_core · Executive: Fahim Mahmud Khan
          </p>
        </div>
        <Link
          href="/"
          className="text-sm font-semibold text-[#060b19] bg-[#00f5d4] px-4 py-2 rounded-lg hover:bg-[#00bbf9] hover:text-white transition"
        >
          ← Central Dashboard
        </Link>
      </header>

      <main className="max-w-5xl mx-auto p-6 space-y-6">
        <div className="rounded-xl border border-[#1e293b] bg-[#0f172a] p-6 relative overflow-hidden before:absolute before:top-0 before:left-0 before:w-1 before:h-full before:bg-[#00f5d4]">
          <h2 className="text-lg font-bold text-white mb-2">One-Click Manufacturing & Sales Console</h2>
          <p className="text-sm text-slate-400 mb-5">
            Gatekeeper: Generation Request → Aigorithm Technical Permit → TAC Creative Brand Approval → Live API Deployment
          </p>

          <label className="block text-xs font-bold text-slate-300 mb-2">Select Target Enterprise Node</label>
          <select
            value={selectedBrand}
            onChange={(e) => {
              setSelectedBrand(e.target.value);
              setIsApproved(false);
              setProcessResult(null);
            }}
            className="w-full p-3 bg-[#060b19] border border-[#334155] rounded-lg text-white mb-4 text-sm"
          >
            <option value="fmk_wig_prosthetic_hair_agent">FMK WIG — Prosthetic Hair Agent</option>
            <option value="fmk_mk_clothing_lifestyle_agent">MK Clothing & Lifestyle Core</option>
            <option value="fmk_mk_kitchen_cloud_food_agent">MK Kitchen Cloud Food Router</option>
            <option value="fmk_shoes_footwear_wing">FMK Shoes (Kadam / Pothik / The Posh Pa)</option>
          </select>

          {selectedMeta && (
            <div className="mb-4 rounded-lg border border-[#334155] bg-[#060b19] p-4 text-xs text-slate-300 space-y-2">
              <p>
                <span className="text-[#00f5d4] font-semibold">{selectedMeta.brand_name}</span>
                {' · '}
                route <code className="text-amber-300">{selectedMeta.route_key}</code>
              </p>
              <p className="text-slate-400">{selectedMeta.scope}</p>
              {selectedMeta.sub_categories && (
                <ul className="list-disc pl-5 text-slate-400">
                  {Object.entries(selectedMeta.sub_categories).map(([key, value]) => (
                    <li key={key}>
                      <span className="text-slate-200">{key}</span>: {value}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <label className="block text-xs font-bold text-slate-300 mb-2">Request Type</label>
          <select
            value={requestType}
            onChange={(e) => setRequestType(e.target.value)}
            className="w-full p-3 bg-[#060b19] border border-[#334155] rounded-lg text-white mb-4 text-sm"
          >
            <option value="Production_Request">Production_Request</option>
            <option value="Sourcing">Sourcing</option>
            <option value="Marketing_Hook">Marketing_Hook</option>
            <option value="Inventory_Forecast">Inventory_Forecast</option>
          </select>

          <label className="block text-xs font-bold text-slate-300 mb-2">SKU Details (JSON, isolated per entity)</label>
          <textarea
            value={skuInput}
            onChange={(e) => setSkuInput(e.target.value)}
            rows={3}
            className="w-full p-3 bg-[#060b19] border border-[#334155] rounded-lg text-white mb-4 text-xs font-mono"
          />

          <div className="p-3 rounded-lg border-l-4 border-[#00bbf9] bg-[#060b19] text-xs text-slate-300 mb-5">
            <strong className="text-[#00bbf9]">System Status:</strong> Cross-Pillar Synchronization connected to{' '}
            <code className="text-amber-300">fmk_media</code> and <code className="text-amber-300">fmk_editing_hub</code>.
            Audio from footwear / FMK WIG hair arrays queues into{' '}
            <code className="text-amber-300">fmk_records_audio_empire_pipeline</code>.
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <button
              onClick={() => void runProcess()}
              disabled={loading}
              className="bg-[#9b5de5] hover:bg-[#00bbf9] disabled:opacity-50 text-white font-bold py-3 rounded-lg text-sm transition"
            >
              {loading ? 'Processing...' : 'Ingest Supply Command'}
            </button>
            <button
              onClick={() => void handleGatekeeperAction()}
              disabled={loading}
              className={`font-bold py-3 rounded-lg text-sm transition disabled:opacity-50 ${
                isApproved
                  ? 'bg-emerald-600 text-white'
                  : 'bg-[#00f5d4] text-[#060b19] hover:bg-[#00bbf9] hover:text-white'
              }`}
            >
              {isApproved ? 'TAC PROTOTYPE DEPLOYED AND LIVE' : 'TRIGGER TAC OVERSIGHT & RUN LIVE'}
            </button>
          </div>

          <p className="text-xs font-mono text-slate-400 mb-3">{telemetry}</p>
          {error && <p className="text-xs font-mono text-red-400 mb-3">{error}</p>}

          {processResult && (
            <pre className="mt-2 p-4 bg-[#060b19] border border-dashed border-[#334155] rounded-lg text-[11px] font-mono text-[#cbd5e1] overflow-x-auto whitespace-pre-wrap">
              {JSON.stringify(processResult, null, 2)}
            </pre>
          )}
        </div>

        <div className="rounded-xl border border-[#1e293b] bg-[#0f172a] p-6">
          <h3 className="text-sm font-bold text-white mb-3">Loaded Entity Memory Map</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {entities.map((entity) => (
              <div
                key={entity.id}
                className={`p-3 rounded-lg border text-xs ${
                  entity.id === selectedBrand
                    ? 'border-[#00f5d4]/40 bg-[#00f5d4]/5 text-[#00f5d4]'
                    : 'border-[#334155] bg-[#060b19] text-slate-300'
                }`}
              >
                <p className="font-semibold">{entity.brand_name}</p>
                <p className="text-[11px] opacity-80 mt-1">{entity.id}</p>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-slate-500 mt-4">
            Isolated execution: FMK WIG, MK Clothing, MK Kitchen, and FMK Shoes runtime arrays never share context lanes (token-bubble mitigation).
          </p>
        </div>
      </main>
    </div>
  );
}
