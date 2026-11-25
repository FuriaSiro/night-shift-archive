import type { Profile, RunState, Scene } from "./types";

const STORAGE_KEY = "night-shift-archive.v1";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readRun(value: unknown): RunState | null {
  if (!isRecord(value)) return null;
  const scenes: Scene[] = ["hub", "planning", "investigation", "summary"];
  if (
    !scenes.includes(value.scene as Scene) ||
    typeof value.time !== "number" ||
    !Number.isFinite(value.time) ||
    typeof value.composure !== "number" ||
    !Number.isFinite(value.composure) ||
    typeof value.favors !== "number" ||
    !Number.isFinite(value.favors) ||
    !Array.isArray(value.resolvedCases) ||
    !Array.isArray(value.clues)
  ) {
    return null;
  }
  return {
    scene: value.scene as Scene,
    time: Math.max(0, Math.min(5, Math.floor(value.time))),
    composure: Math.max(0, Math.min(4, Math.floor(value.composure))),
    favors: Math.max(0, Math.min(2, Math.floor(value.favors))),
    history: Array.isArray(value.history)
      ? value.history.filter((item): item is string => typeof item === "string")
      : [],
    resolvedCases: value.resolvedCases.filter((item): item is string => typeof item === "string"),
    activeCaseId: typeof value.activeCaseId === "string" ? value.activeCaseId : null,
    approach: typeof value.approach === "string" ? value.approach : null,
    clues: value.clues.filter((item): item is string => typeof item === "string"),
    outcome: typeof value.outcome === "string" ? value.outcome : null,
    endReason: typeof value.endReason === "string" ? value.endReason : null,
  };
}

function readProfile(value: unknown, id: number): Profile {
  if (!isRecord(value)) return emptyProfile(id);
  return {
    id,
    loopCount:
      typeof value.loopCount === "number" && Number.isFinite(value.loopCount)
        ? Math.max(0, Math.floor(value.loopCount))
        : 0,
    facts: Array.isArray(value.facts)
      ? value.facts.filter((item): item is string => typeof item === "string")
      : [],
    adaMemory:
      typeof value.adaMemory === "number" && Number.isFinite(value.adaMemory)
        ? Math.max(0, Math.floor(value.adaMemory))
        : 0,
    ivoMemory:
      typeof value.ivoMemory === "number" && Number.isFinite(value.ivoMemory)
        ? Math.max(0, Math.floor(value.ivoMemory))
        : 0,
    run: readRun(value.run),
  };
}

export function emptyProfile(id: number): Profile {
  return { id, loopCount: 0, facts: [], adaMemory: 0, ivoMemory: 0, run: null };
}

export function loadProfiles(): Profile[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [1, 2, 3].map(emptyProfile);
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      console.warn("Saved archive data was malformed; starting with empty profiles.");
      return [1, 2, 3].map(emptyProfile);
    }
    return [1, 2, 3].map((id) => {
      const saved = parsed.find((entry) => isRecord(entry) && entry.id === id);
      return readProfile(saved, id);
    });
  } catch (error) {
    console.warn("Could not read saved archive data; starting with empty profiles.", error);
    return [1, 2, 3].map(emptyProfile);
  }
}

export function saveProfiles(profiles: Profile[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
}
