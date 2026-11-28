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
    inspectionActionId: null,
    inspectionFeedback: null,
    presentedClue: null,
    mapPosition: null,
    mapExplored: [],
    mapMessage: null,
    interviewedTopics: [],
    selectedInterviewId: null,
    shiftOrder: null,
    shiftOrderUsed: false,
    briefingComplete: false,
    entryTimePaid: false,
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
  if (
    run.shiftOrder === "quiet-watch" &&
    !run.shiftOrderUsed &&
    (cost.composure ?? 0) > 0
  ) {
    cost.composure = Math.max(0, (cost.composure ?? 0) - 1);
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
  if (run.scene !== "investigation") return false;
  const archiveCase = getActiveCase(run);
  const activeResolution = archiveCase?.resolutions.find((item) => item.id === resolution.id);
  if (!archiveCase || !activeResolution || run.resolvedCases.includes(archiveCase.id)) return false;
  return hasClue(run, activeResolution.clue) && run.time >= 1;
}

export function canApplyAction(run: RunState, action: CaseAction): boolean {
  if (run.scene !== "investigation") return false;
  const archiveCase = getActiveCase(run);
  const activeAction = archiveCase?.actions.find((item) => item.id === action.id);
  if (!activeAction || run.clues.includes(activeAction.clue)) return false;
  return canAfford(run, getActionCost(run, activeAction));
}

export function applyAction(profile: Profile, run: RunState, action: CaseAction): boolean {
  if (!canApplyAction(run, action)) return false;
  const activeAction = getActiveCase(run)?.actions.find((item) => item.id === action.id);
  if (!activeAction) return false;
  payCost(run, getActionCost(run, activeAction));
  run.time = Math.min(5, run.time + (activeAction.timeRefund ?? 0));
  if (
    run.shiftOrder === "quiet-watch" &&
    !run.shiftOrderUsed &&
    (activeAction.cost.composure ?? 0) > 0
  ) {
    run.shiftOrderUsed = true;
    run.history.push("The quiet watch reduced the first risky lead's Composure cost by 1.");
  }
  if (!run.clues.includes(activeAction.clue)) run.clues.push(activeAction.clue);
  run.inspectionActionId = null;
  run.inspectionFeedback = null;
  run.presentedClue = null;
  if (activeAction.memory) {
    profile.npcMemories[activeAction.memory] = (profile.npcMemories[activeAction.memory] ?? 0) + 1;
  }
  return true;
}

export function finishShift(run: RunState, reason: string): void {
  if (run.scene === "summary") return;
  run.scene = "summary";
  run.endReason = reason;
  run.activeCaseId = null;
  run.approach = null;
  run.inspectionActionId = null;
  run.inspectionFeedback = null;
  run.presentedClue = null;
  run.mapPosition = null;
  run.mapExplored = [];
  run.mapMessage = null;
  run.interviewedTopics = [];
  run.selectedInterviewId = null;
  run.entryTimePaid = false;
}

export function checkFailure(run: RunState): string | null {
  if (run.composure <= 0) return "Your composure gives way. The stacks fold shut around you.";
  if (run.time <= 0) return "Morning reaches the archive before you can finish the shift.";
  return null;
}
