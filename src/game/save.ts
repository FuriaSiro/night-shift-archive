import { archiveCases } from "../content/cases";
import type { Profile, RunState, Scene } from "./types";

const STORAGE_KEY = "night-shift-archive.v1";
const caseIds = new Set(archiveCases.map((archiveCase) => archiveCase.id));
const npcIds = new Set(archiveCases.map((archiveCase) => archiveCase.characterId));

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
  const savedMemories = isRecord(value.npcMemories) ? value.npcMemories : {};
  const npcMemories = Object.fromEntries(
    Object.entries(savedMemories)
      .filter(
        (entry): entry is [string, number] =>
          npcIds.has(entry[0]) &&
          typeof entry[1] === "number" &&
          Number.isFinite(entry[1]) &&
          entry[1] >= 0,
      )
      .map(([name, count]) => [name, Math.floor(count)]),
  );
  if (!("ada" in npcMemories) && typeof value.adaMemory === "number" && Number.isFinite(value.adaMemory)) {
    npcMemories.ada = Math.max(0, Math.floor(value.adaMemory));
  }
  if (!("ivo" in npcMemories) && typeof value.ivoMemory === "number" && Number.isFinite(value.ivoMemory)) {
    npcMemories.ivo = Math.max(0, Math.floor(value.ivoMemory));
  }
  const facts = Array.isArray(value.facts)
    ? value.facts.filter((item): item is string => typeof item === "string")
    : [];
  const savedRun = readRun(value.run);
  const completedCases = Array.isArray(value.completedCases)
    ? [...new Set(value.completedCases.filter((item): item is string => typeof item === "string" && caseIds.has(item)))]
    : archiveCases
        .filter((archiveCase) =>
          savedRun?.resolvedCases.includes(archiveCase.id) ||
          archiveCase.resolutions.some((resolution) => facts.includes(resolution.fact)),
        )
        .map((archiveCase) => archiveCase.id);
  let migratedChapter = 1;
  while (migratedChapter <= Math.max(...archiveCases.map((archiveCase) => archiveCase.chapter))) {
    const chapterCases = archiveCases.filter((archiveCase) => archiveCase.chapter === migratedChapter);
    if (!chapterCases.length || !chapterCases.every((archiveCase) => completedCases.includes(archiveCase.id))) break;
    migratedChapter += 1;
  }
  return {
    id,
    loopCount:
      typeof value.loopCount === "number" && Number.isFinite(value.loopCount)
        ? Math.max(0, Math.floor(value.loopCount))
        : 0,
    chapter:
      typeof value.chapter === "number" && Number.isFinite(value.chapter)
        ? Math.max(1, Math.min(migratedChapter, Math.floor(value.chapter)))
        : migratedChapter,
    completedCases,
    facts,
    npcMemories,
    run: savedRun,
  };
}

export function emptyProfile(id: number): Profile {
  return {
    id,
    loopCount: 0,
    chapter: 1,
    completedCases: [],
    facts: [],
    npcMemories: {},
    run: null,
  };
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
