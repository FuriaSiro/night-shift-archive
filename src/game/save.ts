import { archiveCases } from "../content/cases";
import { ARCHIVE_MAP_HEIGHT, ARCHIVE_MAP_WIDTH } from "./archiveMap";
import type { Profile, RunState, Scene } from "./types";

const STORAGE_KEY = "night-shift-archive.v2";
const LEGACY_STORAGE_KEY = "night-shift-archive.v1";
const SAVE_VERSION = 2;
const caseIds = new Set(archiveCases.map((archiveCase) => archiveCase.id));
const npcIds = new Set(archiveCases.map((archiveCase) => archiveCase.characterId));
const clueIds = new Set(archiveCases.flatMap((archiveCase) =>
  archiveCase.actions.map((action) => action.clue),
));

export interface SaveRecovery {
  raw: string;
  sourceKey: string;
  reason: string;
}

export interface ProfilesLoadResult {
  profiles: Profile[];
  recovery: SaveRecovery | null;
  persistenceError: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isValidSavedRun(value: unknown): boolean {
  if (!isRecord(value)) return false;
  const scenes: Scene[] = ["hub", "planning", "investigation", "summary"];
  return scenes.includes(value.scene as Scene) &&
    typeof value.time === "number" && Number.isFinite(value.time) &&
    typeof value.composure === "number" && Number.isFinite(value.composure) &&
    typeof value.favors === "number" && Number.isFinite(value.favors) &&
    isStringArray(value.resolvedCases) &&
    value.resolvedCases.every((id) => caseIds.has(id)) &&
    isStringArray(value.clues) &&
    value.clues.every((clue) => clueIds.has(clue)) &&
    (value.history === undefined || isStringArray(value.history)) &&
    (value.activeCaseId === undefined || value.activeCaseId === null ||
      (typeof value.activeCaseId === "string" && caseIds.has(value.activeCaseId))) &&
    (value.approach === undefined || value.approach === null || typeof value.approach === "string") &&
    (value.inspectionActionId === undefined || value.inspectionActionId === null || typeof value.inspectionActionId === "string") &&
    (value.inspectionFeedback === undefined || value.inspectionFeedback === null || typeof value.inspectionFeedback === "string") &&
    (value.presentedClue === undefined || value.presentedClue === null || typeof value.presentedClue === "string") &&
    (value.mapPosition === undefined || value.mapPosition === null ||
      (isRecord(value.mapPosition) &&
        typeof value.mapPosition.x === "number" &&
        typeof value.mapPosition.y === "number" &&
        Number.isInteger(value.mapPosition.x) &&
        Number.isInteger(value.mapPosition.y) &&
        value.mapPosition.x >= 0 && value.mapPosition.x < ARCHIVE_MAP_WIDTH &&
        value.mapPosition.y >= 0 && value.mapPosition.y < ARCHIVE_MAP_HEIGHT)) &&
    (value.mapExplored === undefined ||
      (Array.isArray(value.mapExplored) &&
        value.mapExplored.every((cell) =>
          Number.isInteger(cell) && typeof cell === "number" &&
          cell >= 0 && cell < ARCHIVE_MAP_WIDTH * ARCHIVE_MAP_HEIGHT,
        ))) &&
    (value.mapMessage === undefined || value.mapMessage === null || typeof value.mapMessage === "string") &&
    (value.outcome === undefined || value.outcome === null || typeof value.outcome === "string") &&
    (value.endReason === undefined || value.endReason === null || typeof value.endReason === "string");
}

function isValidSavedProfiles(value: unknown): value is Record<string, unknown>[] {
  if (!Array.isArray(value)) return false;
  const ids = new Set<number>();
  return value.every((profile) => {
    if (
      !isRecord(profile) ||
      typeof profile.id !== "number" ||
      ![1, 2, 3].includes(profile.id) ||
      ids.has(profile.id)
    ) {
      return false;
    }
    ids.add(profile.id);
    if (
      (profile.loopCount !== undefined && (typeof profile.loopCount !== "number" || !Number.isFinite(profile.loopCount))) ||
      (profile.chapter !== undefined && (typeof profile.chapter !== "number" || !Number.isFinite(profile.chapter))) ||
      (profile.completedCases !== undefined &&
        (!isStringArray(profile.completedCases) || !profile.completedCases.every((id) => caseIds.has(id)))) ||
      (profile.facts !== undefined && !isStringArray(profile.facts)) ||
      (profile.currentFacts !== undefined && !isStringArray(profile.currentFacts)) ||
      (profile.npcMemories !== undefined && !isRecord(profile.npcMemories)) ||
      (profile.run !== undefined && profile.run !== null && !isValidSavedRun(profile.run)) ||
      (profile.adaMemory !== undefined && (typeof profile.adaMemory !== "number" || !Number.isFinite(profile.adaMemory))) ||
      (profile.ivoMemory !== undefined && (typeof profile.ivoMemory !== "number" || !Number.isFinite(profile.ivoMemory)))
    ) return false;
    if (isRecord(profile.npcMemories)) {
      if (Object.entries(profile.npcMemories).some(([name, count]) =>
        !npcIds.has(name) || typeof count !== "number" || !Number.isFinite(count) || count < 0,
      )) return false;
    }
    return true;
  });
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
    resolvedCases: [...new Set(
      value.resolvedCases.filter((item): item is string => typeof item === "string" && caseIds.has(item)),
    )],
    activeCaseId:
      typeof value.activeCaseId === "string" && caseIds.has(value.activeCaseId)
        ? value.activeCaseId
        : null,
    approach: typeof value.approach === "string" ? value.approach : null,
    clues: value.clues.filter((item): item is string => typeof item === "string"),
    inspectionActionId:
      typeof value.inspectionActionId === "string" ? value.inspectionActionId : null,
    inspectionFeedback:
      typeof value.inspectionFeedback === "string" ? value.inspectionFeedback : null,
    presentedClue:
      typeof value.presentedClue === "string" && value.clues.includes(value.presentedClue)
        ? value.presentedClue
        : null,
    mapPosition:
      isRecord(value.mapPosition) &&
      typeof value.mapPosition.x === "number" &&
      typeof value.mapPosition.y === "number"
        ? { x: value.mapPosition.x, y: value.mapPosition.y }
        : null,
    mapExplored: Array.isArray(value.mapExplored)
      ? value.mapExplored.filter(
          (cell): cell is number =>
            typeof cell === "number" &&
            Number.isInteger(cell) &&
            cell >= 0 &&
            cell < ARCHIVE_MAP_WIDTH * ARCHIVE_MAP_HEIGHT,
        )
      : [],
    mapMessage: typeof value.mapMessage === "string" ? value.mapMessage : null,
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
    ? [...new Set(value.facts.filter((item): item is string => typeof item === "string"))]
    : [];
  const savedCurrentFacts = Array.isArray(value.currentFacts)
    ? [...new Set(value.currentFacts.filter((item): item is string => typeof item === "string"))]
    : facts;
  let savedRun = readRun(value.run);
  const completedCases = Array.isArray(value.completedCases)
    ? [...new Set(value.completedCases.filter((item): item is string => typeof item === "string" && caseIds.has(item)))]
    : archiveCases
        .filter((archiveCase) =>
          savedRun?.resolvedCases.includes(archiveCase.id) ||
          archiveCase.resolutions.some((resolution) => facts.includes(resolution.fact)),
        )
        .map((archiveCase) => archiveCase.id);
  if (
    savedRun?.activeCaseId &&
    savedRun.resolvedCases.includes(savedRun.activeCaseId) &&
    !completedCases.includes(savedRun.activeCaseId)
  ) {
    completedCases.push(savedRun.activeCaseId);
  }
  if (
    savedRun &&
    ((savedRun.scene === "planning" || savedRun.scene === "investigation") &&
      (!savedRun.activeCaseId || completedCases.includes(savedRun.activeCaseId)))
  ) {
    savedRun = {
      ...savedRun,
      scene: "hub",
      activeCaseId: null,
      approach: null,
      inspectionActionId: null,
      inspectionFeedback: null,
      presentedClue: null,
      mapPosition: null,
      mapExplored: [],
      mapMessage: null,
    };
  }
  if (
    savedRun &&
    savedRun.scene !== "summary" &&
    (savedRun.time <= 0 || savedRun.composure <= 0)
  ) {
    savedRun = {
      ...savedRun,
      scene: "summary",
      endReason: savedRun.composure <= 0
        ? "Your composure gives way. The stacks fold shut around you."
        : "Morning reaches the archive before you can finish the shift.",
      activeCaseId: null,
      approach: null,
      inspectionActionId: null,
      inspectionFeedback: null,
      presentedClue: null,
      mapPosition: null,
      mapExplored: [],
      mapMessage: null,
    };
  }
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
    currentFacts: savedCurrentFacts,
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
    currentFacts: [],
    npcMemories: {},
    run: null,
  };
}

function emptyProfiles(): Profile[] {
  return [1, 2, 3].map(emptyProfile);
}

function recover(raw: string, sourceKey: string, reason: string): ProfilesLoadResult {
  return {
    profiles: emptyProfiles(),
    recovery: { raw, sourceKey, reason },
    persistenceError: false,
  };
}

function profilesFrom(value: unknown): Profile[] | null {
  if (!isValidSavedProfiles(value)) return null;
  return [1, 2, 3].map((id) => {
    const saved = value.find((entry) => entry.id === id);
    return readProfile(saved, id);
  });
}

function readVersionedSave(raw: string, sourceKey: string): ProfilesLoadResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return recover(raw, sourceKey, "The saved data is not valid JSON.");
  }

  if (!isRecord(parsed)) {
    return recover(raw, sourceKey, "The save has an unsupported structure.");
  }
  if (parsed.version !== SAVE_VERSION) {
    return recover(
      raw,
      sourceKey,
      `This save uses version ${String(parsed.version)}; this game supports version ${SAVE_VERSION}.`,
    );
  }
  const profiles = profilesFrom(parsed.profiles);
  if (!profiles) {
    return recover(raw, sourceKey, "One or more saved profiles are malformed.");
  }
  return { profiles, recovery: null, persistenceError: false };
}

export function loadProfiles(): ProfilesLoadResult {
  let currentRaw: string | null;
  let legacyRaw: string | null;
  try {
    currentRaw = localStorage.getItem(STORAGE_KEY);
    legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY);
  } catch (error) {
    console.warn("Could not read saved archive data.", error);
    return { profiles: emptyProfiles(), recovery: null, persistenceError: true };
  }

  if (currentRaw !== null) return readVersionedSave(currentRaw, STORAGE_KEY);
  if (legacyRaw === null) {
    return { profiles: emptyProfiles(), recovery: null, persistenceError: false };
  }

  let parsedLegacy: unknown;
  try {
    parsedLegacy = JSON.parse(legacyRaw);
  } catch {
    return recover(legacyRaw, LEGACY_STORAGE_KEY, "The saved data is not valid JSON.");
  }
  const legacyProfiles = profilesFrom(parsedLegacy);
  if (!legacyProfiles) {
    return recover(legacyRaw, LEGACY_STORAGE_KEY, "The legacy save is malformed and was left untouched.");
  }
  const migrated = saveProfiles(legacyProfiles);
  return { profiles: legacyProfiles, recovery: null, persistenceError: !migrated };
}

export function saveProfiles(profiles: Profile[]): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: SAVE_VERSION, profiles }));
    return true;
  } catch (error) {
    console.error("Could not save archive progress in this browser.", error);
    return false;
  }
}

export function startFreshPreservingRecovery(recovery: SaveRecovery): boolean {
  try {
    const baseKey = `night-shift-archive.recovery.${Date.now()}`;
    let backupKey = baseKey;
    let suffix = 1;
    while (localStorage.getItem(backupKey) !== null) {
      backupKey = `${baseKey}.${suffix}`;
      suffix += 1;
    }
    localStorage.setItem(backupKey, recovery.raw);
    if (!saveProfiles(emptyProfiles())) {
      console.error("Could not initialize a fresh save after preserving the unreadable data.");
      return false;
    }
    return true;
  } catch (error) {
    console.error("Could not preserve the unreadable save.", error);
    return false;
  }
}
