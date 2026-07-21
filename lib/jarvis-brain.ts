import brainDb from "@/data/fmk_jarvis_brain_memory.json";
import harnessDb from "@/data/fmk_harness_workers.json";

export type BrainNodeId = "fmk_wig_internal_engine" | "rr_wigs_client_workspace";

export type BrainNode = {
  type: string;
  brand: string;
  purpose: string;
  memory_keys: string[];
  routes: { dashboard: string; api: string; inquiry_webhook?: string };
  harness_agents?: string[];
  agency?: string;
  scope?: string[];
  isolation_level?: string;
};

export function getBrainMemoryRoot() {
  return brainDb.fmk_jarvis_brain_memory;
}

export function listBrainNodes(): Array<{ id: BrainNodeId; node: BrainNode }> {
  const nodes = getBrainMemoryRoot().nodes as Record<BrainNodeId, BrainNode>;
  return Object.entries(nodes).map(([id, node]) => ({
    id: id as BrainNodeId,
    node,
  }));
}

export function getBrainNode(id: BrainNodeId): BrainNode | null {
  const nodes = getBrainMemoryRoot().nodes as Record<string, BrainNode>;
  return nodes[id] ?? null;
}

export function getHarnessWorkers() {
  return harnessDb.fmk_harness_workers.workers;
}

export function brainStatus() {
  const root = getBrainMemoryRoot();
  return {
    ok: true,
    parent_hub: root.parent_hub,
    nodes: listBrainNodes().map(({ id, node }) => ({
      id,
      brand: node.brand,
      type: node.type,
      dashboard: node.routes.dashboard,
    })),
    harness_workers: Object.keys(getHarnessWorkers()),
  };
}
