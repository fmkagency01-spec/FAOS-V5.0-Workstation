import core from "@/data/fmk_group_ltd_core.json";

export type GroupPillarKey = "create" | "media" | "service";

export function getFmkGroupCore() {
  return core;
}

export function getGroupPillars() {
  return core.pillars;
}

export function getMemoryNamespaces(pillar?: GroupPillarKey) {
  if (pillar) {
    return core.pillars[pillar]?.memory_namespaces || [];
  }
  return Object.values(core.pillars).flatMap((p) => p.memory_namespaces || []);
}

export function getSeoGeoTargets() {
  return core.seo_geo_targets || [];
}

export function getAutonomousLoopConfig() {
  return core.autonomous_loop;
}
