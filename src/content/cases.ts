import type { CaseAction, Resolution } from "../game/types";

export interface ArchiveCase {
  id: string;
  chapter: number;
  title: string;
  summary: string;
  character: string;
  characterId: string;
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
  priorFactReactions?: { fact: string; line: string }[];
  approaches: { label: string; actionId: string }[];
  actions: CaseAction[];
  resolutions: Resolution[];
}

export const archiveCases: ArchiveCase[] = [
  {
    id: "bell",
    chapter: 1,
    title: "The Bell in the Margin",
    summary:
      "A brass bell rings in the margins of a story that has no final page. Its archivist refuses to file it.",
    character: "Ada",
    characterId: "ada",
    role: "Margin archivist",
    need: "To know the story can end without erasing what mattered.",
    concern: "That the bell is calling someone who will never arrive.",
    dialogue: {
      firstMeeting: "You're new to the margins. Good—maybe you'll hear the bell and not run.",
      afterNonRiskyClue:
        "So the case had an ending all along.{pause:300} That's the *cruel* part—it just didn't get to say so.",
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
    chapter: 1,
    title: "The Borrowed Voice",
    summary:
      "A recording in the west stacks speaks in the voices of people who have not yet visited the archive.",
    character: "Ivo",
    characterId: "ivo",
    role: "Sound conservator",
    need: "To protect the voices entrusted to the archive.",
    concern: "That listening closely will make the recording take another voice.",
    dialogue: {
      firstMeeting: "Keep your voice down near the reels. They're learning how to keep things.",
      afterNonRiskyClue: "That clue doesn't bite. The ones that do are still wound tight.",
      afterFavor: "A favor, for me? You must want something the archive won't give freely.",
      dejaVu: "{color:#e0b36f}Your voice{/color}—it's already on a reel. That's not possible. Is it?",
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
  {
    id: "return-address",
    chapter: 2,
    title: "The Return Address",
    summary: "A letter arrives stamped with tomorrow's date and no name in its address.",
    character: "Nera",
    characterId: "nera",
    role: "Paper conservator",
    need: "To preserve the message without choosing who it belongs to.",
    concern: "That leaving it unread is another way of abandoning its writer.",
    dialogue: {
      firstMeeting: "The paper is older than the ink. I don't know which part to trust.",
      afterNonRiskyClue: "The stamp points here, not to a person. That may be enough.",
      afterFavor: "You spent a favor to ask what I won't open. Thank you for not opening it.",
      dejaVu: "I remember your hands near the envelope. You waited last time, too.",
      afterRiskyClue: "The seal is broken. We can still choose not to read the words.",
    },
    priorFactReactions: [
      {
        fact: "Ada chose to leave a blank line.",
        line: "Ada left a space for the next reader. I wish more people trusted a blank page.",
      },
      {
        fact: "Something answered from inside the bell.",
        line: "I heard what happened with the bell. I won't open this letter just to force an answer.",
      },
      {
        fact: "Ivo made a quiet room for the borrowed voices.",
        line: "Ivo made a room where a voice can choose to be heard. I want that for this letter, too.",
      },
      {
        fact: "The repeating segment was cut from the recording.",
        line: "You chose to cut the repeating voice. This letter deserves a gentler choice.",
      },
    ],
    approaches: [
      { label: "Study the postmark", actionId: "postmark" },
      { label: "Ask Nera to trust you", actionId: "nera-trust" },
      { label: "Break the seal", actionId: "break-seal" },
    ],
    actions: [
      {
        id: "postmark",
        label: "Compare the postmark",
        description: "Trace the date without opening the letter.",
        cost: { time: 1 },
        clue: "address:stamp",
      },
      {
        id: "nera-trust",
        label: "Ask Nera what she wants to protect",
        description: "Let the conservator set the boundary.",
        cost: { time: 1, favors: 1 },
        clue: "address:promise",
        memory: "nera",
      },
      {
        id: "break-seal",
        label: "Break the seal",
        description: "Risk the message's contents to learn who sent it.",
        cost: { time: 1, composure: 2 },
        clue: "address:inside",
        timeRefund: 1,
      },
    ],
    resolutions: [
      {
        id: "return-unopened",
        label: "File the letter unopened",
        description: "Preserve the choice for whoever claims it.",
        clue: "address:stamp",
        outcome: "Nera files the letter under its date, leaving the seal and its choice intact.",
        fact: "A letter was preserved unopened.",
        socialClue: "address:promise",
        composureReward: 1,
      },
      {
        id: "read-the-letter",
        label: "Record the message's final line",
        description: "Keep the words, though the writer remains unknown.",
        clue: "address:inside",
        outcome: "The last line names no recipient. Nera records it without guessing who should read it.",
        fact: "The letter's final line was recorded.",
      },
    ],
  },
  {
    id: "moving-shelf",
    chapter: 2,
    title: "The Shelf That Moved",
    summary: "A catalog shelf appears in three rooms, but its books never leave the same patch of dust.",
    character: "Tovin",
    characterId: "tovin",
    role: "Stack cartographer",
    need: "To map a place that refuses to stay put.",
    concern: "That a correct map will make the shelf vanish for good.",
    dialogue: {
      firstMeeting: "Don't follow the shelf. Follow what the dust remembers.",
      afterNonRiskyClue: "Same dust, different room. The map can admit it moved.",
      afterFavor: "You let me choose the route. Most people want a straight answer.",
      dejaVu: "You came back to the dust marks. I marked them for you this time.",
      afterRiskyClue: "It moved while we watched. I can still draw where it was.",
    },
    priorFactReactions: [
      {
        fact: "A letter was preserved unopened.",
        line: "Nera left the letter sealed. I'll map the shelf without deciding where it belongs.",
      },
      {
        fact: "The letter's final line was recorded.",
        line: "Nera kept the last line. I'll record every place the shelf has been, not just its end.",
      },
    ],
    approaches: [
      { label: "Map the dust", actionId: "dust-map" },
      { label: "Ask Tovin to guide you", actionId: "tovin-guide" },
      { label: "Follow it in the dark", actionId: "follow-shelf" },
    ],
    actions: [
      {
        id: "dust-map",
        label: "Map the dust marks",
        description: "Compare the shelf's footprint across rooms.",
        cost: { time: 1 },
        clue: "shelf:dust",
      },
      {
        id: "tovin-guide",
        label: "Let Tovin choose the route",
        description: "Trade a Favor for a map made at their pace.",
        cost: { time: 1, favors: 1 },
        clue: "shelf:route",
        memory: "tovin",
      },
      {
        id: "follow-shelf",
        label: "Follow the shelf after lights-out",
        description: "Risk losing your bearings to see where it goes.",
        cost: { time: 1, composure: 2 },
        clue: "shelf:footsteps",
        timeRefund: 1,
      },
    ],
    resolutions: [
      {
        id: "map-the-change",
        label: "File a map that shows every location",
        description: "Let the archive's movement become part of the record.",
        clue: "shelf:dust",
        outcome: "Tovin draws each location on one map. The shelf can move without becoming a mistake.",
        fact: "The moving shelf was mapped in every room.",
        socialClue: "shelf:route",
        composureReward: 1,
      },
      {
        id: "mark-the-trail",
        label: "Mark the shelf's trail",
        description: "Record its route instead of fixing its position.",
        clue: "shelf:footsteps",
        outcome: "The trail ends at a blank wall. Tovin leaves the map unfinished, with room for another route.",
        fact: "The moving shelf left a trail beyond the map.",
      },
    ],
  },
  {
    id: "last-lamp",
    chapter: 3,
    title: "The Last Lamp",
    summary: "One desk lamp stays lit over a book no one remembers checking out.",
    character: "Mara",
    characterId: "mara",
    role: "Night supervisor",
    need: "To let the forgotten book be read before it is filed.",
    concern: "That keeping it open will keep the night from ending.",
    dialogue: {
      firstMeeting: "I can turn the lamp off. I can't make the empty desk feel empty.",
      afterNonRiskyClue: "Someone kept this place warm. The ledger doesn't say who.",
      afterFavor: "You asked what I miss, not what the rules allow. That's rare here.",
      dejaVu: "You left the lamp on before. I thought I was the only one who noticed.",
      afterRiskyClue: "The wick flared when you opened it. Let's not mistake that for an answer.",
    },
    priorFactReactions: [
      {
        fact: "The moving shelf was mapped in every room.",
        line: "Tovin mapped every room. I want to leave one place open instead of pinning it down.",
      },
      {
        fact: "The moving shelf left a trail beyond the map.",
        line: "Tovin followed the shelf past the map. I won't ask this lamp to light an unknown route.",
      },
    ],
    approaches: [
      { label: "Read the lamp ledger", actionId: "lamp-ledger" },
      { label: "Ask Mara what is missing", actionId: "mara-trust" },
      { label: "Open the forgotten book", actionId: "open-book" },
    ],
    actions: [
      {
        id: "lamp-ledger",
        label: "Check the lamp ledger",
        description: "Find when the light was last meant to go out.",
        cost: { time: 1 },
        clue: "lamp:ledger",
      },
      {
        id: "mara-trust",
        label: "Ask Mara what she remembers",
        description: "Hear the supervisor's account before the record.",
        cost: { time: 1, favors: 1 },
        clue: "lamp:memory",
        memory: "mara",
      },
      {
        id: "open-book",
        label: "Open the forgotten book",
        description: "Risk the light's hold on the room.",
        cost: { time: 1, composure: 2 },
        clue: "lamp:flare",
        timeRefund: 1,
      },
    ],
    resolutions: [
      {
        id: "leave-lamp",
        label: "Leave the lamp for the next reader",
        description: "Keep one place open without keeping the whole archive awake.",
        clue: "lamp:ledger",
        outcome: "Mara lowers the lamp but leaves it lit. The book can wait without being forgotten.",
        fact: "The last lamp was left for another reader.",
        socialClue: "lamp:memory",
        composureReward: 1,
      },
      {
        id: "close-the-book",
        label: "Close the book and let morning in",
        description: "End the vigil, even if the name stays unknown.",
        clue: "lamp:flare",
        outcome: "The lamp goes dark. Mara opens the shutters, and the archive accepts an unfinished name.",
        fact: "The forgotten book was closed at dawn.",
      },
    ],
  },
  {
    id: "morning-index",
    chapter: 3,
    title: "The Morning Index",
    summary: "The index has begun listing stories that have not been written yet—including the archive itself.",
    character: "Eren",
    characterId: "eren",
    role: "Index keeper",
    need: "To leave the next shift a choice, not an instruction.",
    concern: "That the archive will file every unfinished thing as a failure.",
    dialogue: {
      firstMeeting: "The index is filling itself in. I need one line it can't decide for us.",
      afterNonRiskyClue: "It lists endings as if they were addresses. None of them are destinations.",
      afterFavor: "You spent a favor to hear the question, not to force an answer.",
      dejaVu: "I remember the line you left open. The index still hasn't closed it.",
      afterRiskyClue: "It wrote your name in the margin. We can still choose what comes after.",
    },
    priorFactReactions: [
      {
        fact: "The last lamp was left for another reader.",
        line: "Mara left a lamp for whoever came next. I can leave the index open the same way.",
      },
      {
        fact: "The forgotten book was closed at dawn.",
        line: "Mara let the book close at dawn. The index should be allowed an ending, too.",
      },
    ],
    approaches: [
      { label: "Compare the blank entries", actionId: "blank-index" },
      { label: "Ask Eren to leave a choice", actionId: "eren-trust" },
      { label: "Read the live index", actionId: "read-index" },
    ],
    actions: [
      {
        id: "blank-index",
        label: "Compare the blank entries",
        description: "Look for the one line the index cannot complete.",
        cost: { time: 1 },
        clue: "index:blank",
      },
      {
        id: "eren-trust",
        label: "Ask Eren what should stay open",
        description: "Let the index keeper choose what not to decide.",
        cost: { time: 1, favors: 1 },
        clue: "index:choice",
        memory: "eren",
      },
      {
        id: "read-index",
        label: "Read the index as it changes",
        description: "Risk seeing your own unfinished entry.",
        cost: { time: 1, composure: 2 },
        clue: "index:echo",
        timeRefund: 1,
      },
    ],
    resolutions: [
      {
        id: "leave-a-margin",
        label: "Leave a margin for the next shift",
        description: "File the index with a space for a human choice.",
        clue: "index:blank",
        outcome: "Eren leaves the final line blank. The archive will wait for someone to decide what belongs there.",
        fact: "The Morning Index was left open to a future choice.",
        socialClue: "index:choice",
        composureReward: 1,
      },
      {
        id: "write-the-entry",
        label: "Write your own unfinished entry",
        description: "Give the archive a story it cannot finish for you.",
        clue: "index:echo",
        outcome: "Your name appears beside a sentence with no ending. Eren closes the index without closing the story.",
        fact: "The player left an unfinished entry in the index.",
      },
    ],
  },
];
