import { archiveCases, type ArchiveCase } from "../content/cases";
import type { CaseAction, Profile, Resolution, RunState } from "./types";

export function newRun(): RunState {
  return {
    scene: "hub",
    time: 5,
    composure: 4,
    favors: 1,
    history: [],
    resolvedCases: [],
    activeCaseId: null,
    approach: null,
    clues: [],
    outcome: null,
    endReason: null,
  };
}

export function getActiveCase(run: RunState): ArchiveCase | undefined {
  return archiveCases.find((archiveCase) => archiveCase.id === run.activeCaseId);
}

export function canAfford(run: RunState, cost: CaseAction["cost"]): boolean {
  return run.time >= (cost.time ?? 0) &&
    run.composure >= (cost.composure ?? 0) &&
    run.favors >= (cost.favors ?? 0);
}

export function payCost(run: RunState, cost: CaseAction["cost"]): void {
  run.time -= cost.time ?? 0;
  run.composure -= cost.composure ?? 0;
  run.favors -= cost.favors ?? 0;
}

export function getActionCost(run: RunState, action: CaseAction): CaseAction["cost"] {
  const cost = { ...action.cost };
  const archiveCase = getActiveCase(run);
  const plannedApproach = archiveCase?.approaches.find((approach) => approach.label === run.approach);
  if (plannedApproach?.actionId === action.id) {
    cost.time = Math.max(0, (cost.time ?? 0) - 1);
  }
  return cost;
}

export function hasClue(run: RunState, clue: string): boolean {
  const relatedClues: Record<string, string[]> = {
    "bell:ink": ["bell:ink", "bell:promise"],
    "bell:echo": ["bell:echo"],
    "voice:script": ["voice:script", "voice:cadence"],
    "voice:echo": ["voice:echo"],
    "address:stamp": ["address:stamp", "address:promise"],
    "shelf:dust": ["shelf:dust", "shelf:route"],
    "lamp:ledger": ["lamp:ledger", "lamp:memory"],
    "index:blank": ["index:blank", "index:choice"],
  };
  return (relatedClues[clue] ?? [clue]).some((item) => run.clues.includes(item));
}

export function canResolve(run: RunState, resolution: Resolution): boolean {
  return hasClue(run, resolution.clue) && run.time >= 1;
}

export function applyAction(profile: Profile, run: RunState, action: CaseAction): void {
  payCost(run, getActionCost(run, action));
  run.time = Math.min(5, run.time + (action.timeRefund ?? 0));
  if (!run.clues.includes(action.clue)) run.clues.push(action.clue);
  if (action.memory) {
    profile.npcMemories[action.memory] = (profile.npcMemories[action.memory] ?? 0) + 1;
  }
}

export function finishShift(run: RunState, reason: string): void {
  run.scene = "summary";
  run.endReason = reason;
  run.activeCaseId = null;
  run.approach = null;
}

export function checkFailure(run: RunState): string | null {
  if (run.composure <= 0) return "Your composure gives way. The stacks fold shut around you.";
  if (run.time <= 0) return "Morning reaches the archive before you can finish the shift.";
  return null;
}
