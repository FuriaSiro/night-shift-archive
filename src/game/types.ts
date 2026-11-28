import type { MapPosition } from "./archiveMap";

export type Scene = "hub" | "planning" | "investigation" | "summary";
export type NpcId = "ada" | "ivo" | "nera" | "tovin" | "mara" | "eren";

export const shiftOrders = [
  {
    id: "open-table",
    label: "Open the favor ledger",
    description: "Start this shift with +1 Favor (maximum 2).",
  },
  {
    id: "fast-index",
    label: "Fast-track the first file",
    description: "Entering your first case this shift costs no Time.",
  },
  {
    id: "quiet-watch",
    label: "Assign a quiet watch",
    description: "Your first risky lead costs 1 less Composure.",
  },
] as const;

export type ShiftOrderId = typeof shiftOrders[number]["id"];

export interface InterviewTopic {
  id: string;
  label: string;
  question: string;
  response: string;
}

export interface RunState {
  scene: Scene;
  time: number;
  composure: number;
  favors: number;
  history: string[];
  resolvedCases: string[];
  activeCaseId: string | null;
  approach: string | null;
  clues: string[];
  inspectionActionId: string | null;
  inspectionFeedback: string | null;
  presentedClue: string | null;
  mapPosition: MapPosition | null;
  mapExplored: number[];
  mapMessage: string | null;
  interviewedTopics: string[];
  selectedInterviewId: string | null;
  shiftOrder: ShiftOrderId | null;
  shiftOrderUsed: boolean;
  briefingComplete: boolean;
  entryTimePaid: boolean;
  outcome: string | null;
  endReason: string | null;
}

export interface Profile {
  id: number;
  loopCount: number;
  chapter: number;
  completedCases: string[];
  facts: string[];
  currentFacts: string[];
  npcMemories: Record<string, number>;
  run: RunState | null;
}

export interface Cost {
  time?: number;
  composure?: number;
  favors?: number;
}

export interface CaseAction {
  id: string;
  label: string;
  description: string;
  cost: Cost;
  clue: string;
  inspection?: {
    versionA: string;
    versionB: string;
    question: string;
    options: [string, string, string];
    answer: number;
  };
  memory?: NpcId;
  timeRefund?: number;
}

export interface Resolution {
  id: string;
  label: string;
  description: string;
  clue: string;
  outcome: string;
  fact: string;
  socialClue?: string;
  composureReward?: number;
}
