import modulesDb from "@/data/faos_modules.json";

export type FaosModule = {
  id: string;
  name: string;
  icon: string;
  route: string;
  category: string;
  tier: "core" | "pro" | "enterprise";
  enabled: boolean;
  description: string;
};

export type ModulePreferences = Record<string, boolean>;

const PREFS_KEY = "faos_module_preferences";

export function getAllModules(): FaosModule[] {
  return modulesDb.modules as FaosModule[];
}

export function getModuleById(id: string): FaosModule | undefined {
  return getAllModules().find((m) => m.id === id);
}

/** Client-side: merge localStorage overrides with defaults */
export function getEnabledModules(prefs?: ModulePreferences): FaosModule[] {
  const merged = { ...loadModulePreferences(), ...prefs };
  return getAllModules().filter((m) => merged[m.id] ?? m.enabled);
}

export function loadModulePreferences(): ModulePreferences {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    return raw ? (JSON.parse(raw) as ModulePreferences) : {};
  } catch {
    return {};
  }
}

export function saveModulePreferences(prefs: ModulePreferences): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
}

export function setModuleEnabled(id: string, enabled: boolean): ModulePreferences {
  const next = { ...loadModulePreferences(), [id]: enabled };
  saveModulePreferences(next);
  return next;
}
