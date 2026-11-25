import type { CaseAction, Resolution } from "../game/types";

export interface ArchiveCase {
  id: string;
  title: string;
  summary: string;
  character: string;
  role: string;
  need: string;
  concern: string;
  dialogue: {
    firstMeeting: string;
    afterNonRiskyClue: string;
    afterFavor: string;
    dejaVu: string;
    afterRiskyClue: string;
  };
  approaches: { label: string; actionId: string }[];
  actions: CaseAction[];
  resolutions: Resolution[];
}

export const archiveCases: ArchiveCase[] = [
  {
    id: "bell",
    title: "The Bell in the Margin",
    summary:
      "A brass bell rings in the margins of a story that has no final page. Its archivist refuses to file it.",
    character: "Ada",
    role: "Margin archivist",
    need: "To know the story can end without erasing what mattered.",
    concern: "That the bell is calling someone who will never arrive.",
    dialogue: {
      firstMeeting: "You're new to the margins. Good—maybe you'll hear the bell and not run.",
      afterNonRiskyClue:
        "So the case had an ending all along. That's the cruel part—it just didn't get to say so.",
      afterFavor: "You spent a favor on me? People usually spend them to get away.",
      dejaVu:
        "Wait—you asked me about the bell before. Didn't you? I remember your voice, not the words.",
      afterRiskyClue:
        "The bell has answered. Let's let the echo settle before we decide what it means.",
    },
    approaches: [
      { label: "Study the ink", actionId: "ink" },
      { label: "Listen for the pattern", actionId: "ring-bell" },
      { label: "Earn Ada's trust", actionId: "ask-ada" },
    ],
    actions: [
      {
        id: "ink",
        label: "Compare the unfinished ink",
        description: "Look for a repeated mark that could point to a missing ending.",
        cost: { time: 1 },
        clue: "bell:ink",
      },
      {
        id: "ask-ada",
        label: "Ask Ada what she hopes the bell means",
        description: "Offer to help her keep the memory, even if the story changes.",
        cost: { time: 1, favors: 1 },
        clue: "bell:promise",
        memory: "ada",
      },
      {
        id: "ring-bell",
        label: "Ring the bell once",
        description: "Risk the disquieting echo to learn what answers.",
        cost: { time: 1, composure: 2 },
        clue: "bell:echo",
        timeRefund: 1,
      },
    ],
    resolutions: [
      {
        id: "gentle-ending",
        label: "Help Ada write an ending that leaves the bell silent",
        description: "A careful ending, shaped by evidence or trust.",
        clue: "bell:ink",
        outcome:
          "Ada files the story with a blank line left for whoever reads it next. The bell is quiet, but not forgotten.",
        fact: "Ada chose to leave a blank line.",
        socialClue: "bell:promise",
        composureReward: 1,
      },
      {
        id: "answering-ending",
        label: "Write down what answered from inside the bell",
        description: "A riskier ending, made possible by hearing the echo.",
        clue: "bell:echo",
        outcome:
          "The echo becomes the story's last sentence. Ada is shaken, yet relieved to have an answer she can file.",
        fact: "Something answered from inside the bell.",
      },
    ],
  },
  {
    id: "voice",
    title: "The Borrowed Voice",
    summary:
      "A recording in the west stacks speaks in the voices of people who have not yet visited the archive.",
    character: "Ivo",
    role: "Sound conservator",
    need: "To protect the voices entrusted to the archive.",
    concern: "That listening closely will make the recording take another voice.",
    dialogue: {
      firstMeeting: "Keep your voice down near the reels. They're learning how to keep things.",
      afterNonRiskyClue: "That clue doesn't bite. The ones that do are still wound tight.",
      afterFavor: "A favor, for me? You must want something the archive won't give freely.",
      dejaVu: "Your voice—it's already on a reel. That's not possible. Is it?",
      afterRiskyClue: "That's enough of the reel for now. I can still hear it settling.",
    },
    approaches: [
      { label: "Read the label", actionId: "label" },
      { label: "Ask Ivo to listen with you", actionId: "ask-ivo" },
      { label: "Test the recording", actionId: "play-recording" },
    ],
    actions: [
      {
        id: "label",
        label: "Read the recording's old label",
        description: "Trace the catalog marks without playing the tape.",
        cost: { time: 1 },
        clue: "voice:script",
      },
      {
        id: "ask-ivo",
        label: "Ask Ivo to listen with you",
        description: "Share the risk and let Ivo set the pace.",
        cost: { time: 1, favors: 1 },
        clue: "voice:cadence",
        memory: "ivo",
      },
      {
        id: "play-recording",
        label: "Play three seconds of the recording",
        description: "A brief test may reveal its source, but it will unsettle you.",
        cost: { time: 1, composure: 2 },
        clue: "voice:echo",
        timeRefund: 1,
      },
    ],
    resolutions: [
      {
        id: "shared-voice",
        label: "Give the borrowed voices their own quiet room",
        description: "A respectful solution, guided by the label or Ivo.",
        clue: "voice:script",
        outcome:
          "Ivo seals the recording in a listening room where every voice can be heard by choice, never by surprise.",
        fact: "Ivo made a quiet room for the borrowed voices.",
        socialClue: "voice:cadence",
        composureReward: 1,
      },
      {
        id: "cut-the-loop",
        label: "Cut the repeating segment from the recording",
        description: "A decisive solution, possible after hearing the loop yourself.",
        clue: "voice:echo",
        outcome:
          "The voices stop repeating. Ivo dislikes the bluntness of it, but the tape can no longer take another visitor's voice.",
        fact: "The repeating segment was cut from the recording.",
      },
    ],
  },
];
