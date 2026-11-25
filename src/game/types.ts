export type Scene = "hub" | "planning" | "investigation" | "summary";

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
  outcome: string | null;
  endReason: string | null;
}

export interface Profile {
  id: number;
  loopCount: number;
  facts: string[];
  adaMemory: number;
  ivoMemory: number;
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
  memory?: "ada" | "ivo";
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
