import type { CaseAction, InterviewTopic, Resolution } from "../game/types";

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
  interviewTopics: InterviewTopic[];
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
      firstMeeting: "Before we decide what the bell means, show me what the ink actually says.",
      afterNonRiskyClue:
        "One mark repeats. That's evidence; its meaning is still ours to choose.",
      afterFavor: "You spent a favor to ask what I fear. Plainly? I don't want the bell mistaken for a promise.",
      dejaVu: "We've stood here before—or I've filed this moment too carefully. The bell hasn't changed its mind.",
      afterRiskyClue: "The echo is real. Its meaning isn't proven. I'll record both facts.",
    },
    approaches: [
      { label: "Study the ink", actionId: "ink" },
      { label: "Listen for the pattern", actionId: "ring-bell" },
      { label: "Earn Ada's trust", actionId: "ask-ada" },
    ],
    interviewTopics: [
      { id: "bell-arrival", label: "Who was the bell meant to call?", question: "Who was the bell meant to call?", response: "Ada says the margin names no person. It may have been written as an invitation, not a summons." },
      { id: "bell-missing", label: "What is missing from the story?", question: "What is missing from the story?", response: "Ada has kept the blank final page separate from the rest. She does not call it unfinished; she calls it unclaimed." },
      { id: "bell-choice", label: "What can you still choose?", question: "What can you still choose?", response: "Ada believes the bell's meaning can be recorded without being treated as proof." },
    ],
    actions: [
      {
        id: "ink",
        label: "Compare the unfinished ink",
        description: "Look for a repeated mark that could point to a missing ending.",
        cost: { time: 1 },
        clue: "bell:ink",
        inspection: {
          versionA: "At the bell, leave a blank line for the next reader.",
          versionB: "At the bell, leave no line for the next reader.",
          question: "What changed between the two copies?",
          options: [
            "The instruction changed from leaving a blank line to leaving no line.",
            "The bell was removed from the instruction.",
            "The next reader was replaced by the archivist.",
          ],
          answer: 0,
        },
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
      firstMeeting: "This reel is dated tomorrow. I've stopped asking which side of today it belongs to.",
      afterNonRiskyClue: "The label matches a voice that hasn't visited. I can't tell if that's memory or warning.",
      afterFavor: "You spent a favor to hear what I'd keep quiet: these voices deserve a choice.",
      dejaVu: "Your voice feels familiar before you speak. I dislike how often that's been true.",
      afterRiskyClue: "That wasn't your voice on the reel. Not yet, at least. Please don't ask me what I mean.",
    },
    approaches: [
      { label: "Read the label", actionId: "label" },
      { label: "Ask Ivo to listen with you", actionId: "ask-ivo" },
      { label: "Test the recording", actionId: "play-recording" },
    ],
    interviewTopics: [
      { id: "voice-owner", label: "Whose voice was recorded?", question: "Whose voice was recorded?", response: "Ivo says the reel contains cadences no one has claimed. The people who hear it may recognize themselves too quickly." },
      { id: "voice-warning", label: "Why was the west label changed?", question: "Why was the west label changed?", response: "Ivo thinks the label describes where to listen, not where the recording belongs." },
      { id: "voice-boundary", label: "What should never be copied?", question: "What should never be copied?", response: "Ivo refuses to duplicate an uninvited voice. Consent, even across years, is part of his archive." },
    ],
    actions: [
      {
        id: "label",
        label: "Read the recording's old label",
        description: "Trace the catalog marks without playing the tape.",
        cost: { time: 1 },
        clue: "voice:script",
        inspection: {
          versionA: "BORROWED VOICE · return to the west stacks at dawn",
          versionB: "BORROWED VOICE · return to the east stacks at dawn",
          question: "Which detail does not match the earlier label?",
          options: [
            "The recording's destination changed from the west stacks to the east stacks.",
            "The label changed from borrowed voice to original recording.",
            "The return time changed from dawn to midnight.",
          ],
          answer: 0,
        },
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
      firstMeeting: "A letter can arrive without naming its reader. Perhaps the blank space belongs to it.",
      afterNonRiskyClue: "The stamp points to the archive, not a person. We can stop at what we know.",
      afterFavor: "You spent a favor to ask what I won't open. Thank you for leaving the choice with me.",
      dejaVu: "I remember you waiting by the seal. Have we already made this choice?",
      afterRiskyClue: "The paper gave way easily. That doesn't mean the message was meant for us.",
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
    interviewTopics: [
      { id: "address-date", label: "Why does tomorrow have a postmark?", question: "Why does tomorrow have a postmark?", response: "Nera sees a date that may describe intention rather than travel. She has marked it as arrival, not proof." },
      { id: "address-reader", label: "Who owns an unread letter?", question: "Who owns an unread letter?", response: "Nera believes an undelivered letter can belong to the person named by the writer or to no one yet." },
      { id: "address-limit", label: "What boundary would you keep?", question: "What boundary would you keep?", response: "Nera would preserve the seal unless the writer's need is written clearly enough to change her mind." },
    ],
    actions: [
      {
        id: "postmark",
        label: "Compare the postmark",
        description: "Trace the date without opening the letter.",
        cost: { time: 1 },
        clue: "address:stamp",
        inspection: {
          versionA: "RETURN ADDRESS · tomorrow · recipient: [blank]",
          versionB: "RETURN ADDRESS · tomorrow · recipient: Nera",
          question: "What was added to the second copy?",
          options: [
            "A recipient's name was added where the address was blank.",
            "The date changed from tomorrow to yesterday.",
            "The letter was marked as already opened.",
          ],
          answer: 0,
        },
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
      firstMeeting: "If the shelf moves, don't chase it. Mark the room it leaves behind.",
      afterNonRiskyClue: "Three rooms, one dust mark. The map needn't choose which room is real.",
      afterFavor: "You spent a favor to let me set the route. I'll take the long way; it tells us more.",
      dejaVu: "Back again. This time the dust moved before the shelf did.",
      afterRiskyClue: "The footsteps pass the stacks. I'll mark where they end, not guess what lies beyond.",
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
    interviewTopics: [
      { id: "shelf-pattern", label: "How does the shelf move?", question: "How does the shelf move?", response: "Tovin says the shelf follows a route only when someone stops looking directly at it." },
      { id: "shelf-trace", label: "What does the dust prove?", question: "What does the dust prove?", response: "The dust proves only that something occupied three places. Tovin refuses to let the trace decide which one was real." },
      { id: "shelf-map", label: "Should a map fix it in place?", question: "Should a map fix it in place?", response: "Tovin would rather make a map of paths than claim any room is permanent." },
    ],
    actions: [
      {
        id: "dust-map",
        label: "Map the dust marks",
        description: "Compare the shelf's footprint across rooms; checking all three takes time.",
        cost: { time: 2 },
        clue: "shelf:dust",
        inspection: {
          versionA: "DUST TRACE · Reading Room / Records Desk / Restricted Stacks",
          versionB: "DUST TRACE · Reading Room / Records Desk",
          question: "Which location is missing from the newer trace?",
          options: [
            "Restricted Stacks",
            "Reading Room",
            "Records Desk",
          ],
          answer: 0,
        },
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
      firstMeeting: "The lamp's in the wrong place. I keep moving it back.",
      afterNonRiskyClue: "The ledger says it was lit for someone. It doesn't say they arrived.",
      afterFavor: "You spent a favor to ask what I miss. The quiet before opening bell.",
      dejaVu: "You noticed the lamp last time. I hoped I'd imagined that.",
      afterRiskyClue: "The page caught the light like it knew you. I'll call it reflection until I know better.",
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
    interviewTopics: [
      { id: "lamp-watcher", label: "Who keeps the lamp lit?", question: "Who keeps the lamp lit?", response: "Mara says it has outlasted every duty roster. She stopped asking whether the light is a person or an obligation." },
      { id: "lamp-deadline", label: "Is morning a deadline?", question: "Is morning a deadline?", response: "Mara thinks morning ends a vigil only if the record accepts that ending." },
      { id: "lamp-reminder", label: "What must not be forgotten?", question: "What must not be forgotten?", response: "Mara wants the forgotten reader remembered even if the archive cannot recover a name." },
    ],
    actions: [
      {
        id: "lamp-ledger",
        label: "Check the lamp ledger",
        description: "Find when the light was last meant to go out.",
        cost: { time: 1 },
        clue: "lamp:ledger",
        inspection: {
          versionA: "LAMP LEDGER · scheduled to go dark at 05:00",
          versionB: "LAMP LEDGER · scheduled to go dark at 06:00",
          question: "What changed in the revised ledger?",
          options: [
            "The scheduled closing time moved one hour later.",
            "The lamp was moved to a different desk.",
            "The book was checked out before dawn.",
          ],
          answer: 0,
        },
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
    interviewTopics: [
      { id: "index-author", label: "Who is writing ahead?", question: "Who is writing ahead?", response: "Eren cannot prove whether the index predicts, remembers, or asks to be answered." },
      { id: "index-failure", label: "Can an unfinished story fail?", question: "Can an unfinished story fail?", response: "Eren believes failure belongs to an owner. An unfinished record belongs to every reader who might return." },
      { id: "index-next", label: "What should the next shift inherit?", question: "What should the next shift inherit?", response: "Eren wants the next shift to inherit a choice, not a command disguised as an ending." },
    ],
    actions: [
      {
        id: "blank-index",
        label: "Compare the blank entries",
        description: "Look for the one line the index cannot complete.",
        cost: { time: 1 },
        clue: "index:blank",
        inspection: {
          versionA: "MORNING INDEX · one entry remains open for a future reader",
          versionB: "MORNING INDEX · every entry has been completed",
          question: "What instruction replaced the open entry?",
          options: [
            "Complete every entry instead of leaving one open.",
            "Move the open entry to the previous night.",
            "Remove the index from the archive.",
          ],
          answer: 0,
        },
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
