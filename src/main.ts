// @ts-ignore CSS is loaded by the bundler; TypeScript has no CSS module declaration.
import "./styles.css";
import { archiveCases } from "./content/cases";
import type { CaseAction, Cost, Profile, Resolution, RunState } from "./game/types";
import {
  afterDialogueRender,
  handleDialogueAction,
  handleDialogueChange,
  handleDialogueKeydown,
  renderDialoguePanel,
  type DialogueBeat,
} from "./ui/dialogue";
import { loadProfiles, saveProfiles, emptyProfile } from "./game/save";
import {
  applyAction,
  canAfford,
  canResolve,
  checkFailure,
  finishShift,
  getActionCost,
  getActiveCase,
  hasClue,
  newRun,
  payCost,
} from "./game/rules";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("App root element is missing.");
const appRoot: HTMLDivElement = app;
const TEXT_SIZE_KEY = "night-shift-archive.text-size.v1";
const chapterNames = [
  "The first record",
  "Rooms out of order",
  "Before the index closes",
];
const campaignComplete = (profile: Profile): boolean =>
  archiveCases.every((archiveCase) => profile.completedCases.includes(archiveCase.id));

let profiles = loadProfiles();
let activeProfileId: number | null = null;
let largeText = loadLargeTextPreference();
let persistenceError = false;

function loadLargeTextPreference(): boolean {
  try {
    return localStorage.getItem(TEXT_SIZE_KEY) === "large";
  } catch (error) {
    console.warn("Could not read the text-size preference; using standard text.", error);
    return false;
  }
}

function readingControl(): string {
  return `<button class="text-button reading-toggle" data-action="toggle-reading" aria-pressed="${largeText}" aria-label="Toggle larger text">Reading size: ${largeText ? "Large" : "Standard"}</button>`;
}

function selectedProfile(): Profile | undefined {
  return profiles.find((profile) => profile.id === activeProfileId);
}

function persist(): void {
  persistenceError = !saveProfiles(profiles);
}

function renderPersistenceNotice(): void {
  if (persistenceError) {
    appRoot.insertAdjacentHTML(
      "afterbegin",
      `<p class="persistence-warning" role="alert">Could not save changes in this browser. Progress may be lost if you leave or refresh.</p>`,
    );
  }
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });
}

function costLabel(
  cost: Cost,
  options: { matchingLead?: boolean; timeRefund?: number } = {},
): string {
  const parts: string[] = [];
  if (cost.time !== undefined) {
    const timeLabel = options.matchingLead
      ? cost.time === 0
        ? "0 time (planned)"
        : `${cost.time} time after plan`
      : `${cost.time} time`;
    parts.push(timeLabel);
  }
  if (cost.composure) parts.push(`${cost.composure} composure`);
  if (cost.favors) parts.push(`${cost.favors} favor`);
  const costText = parts.length ? `Cost: ${parts.join(", ")}` : "No resource cost";
  const effects: string[] = [];
  if (options.timeRefund) effects.push(`success +${options.timeRefund} time`);
  return effects.length ? `${costText} · ${effects.join(" · ")}` : costText;
}

function resourceBar(run: RunState): string {
  const timePips = Array.from(
    { length: 5 },
    (_, index) => `<span class="time-pip ${index < run.time ? "active" : ""}"></span>`,
  ).join("");
  return `<section class="resources" aria-label="Shift resources">
    <div class="resource time-resource" aria-label="Time remaining: ${run.time} of 5">
      <div class="resource-heading"><span>Time</span><strong>${run.time}<small> / 5</small></strong></div>
      <div class="time-pips" aria-hidden="true">${timePips}</div>
    </div>
    <div class="resource"><span>Composure</span><strong>${run.composure}<small> / 4</small></strong></div>
    <div class="resource"><span>Favors</span><strong>${run.favors}<small> / 2</small></strong></div>
  </section>`;
}

function profileScreen(): string {
  const slots = profiles.map((profile) => {
    const occupied = profile.loopCount > 0;
    const runLabel = campaignComplete(profile)
      ? "Replay campaign · memories kept"
      : profile.run?.scene === "summary"
        ? "Continue campaign"
        : profile.run
          ? "Continue current shift"
          : occupied
            ? "Continue campaign"
            : "Start a new profile";
    const rememberedMoments = Object.values(profile.npcMemories).reduce((total, count) => total + count, 0);
    return `<article class="profile-card ${occupied ? "" : "empty"}">
      <div>
        <p class="eyebrow">PROFILE ${profile.id}</p>
        <h2>${occupied ? `Night ${profile.loopCount}` : "An empty file"}</h2>
        <p>${occupied ? `${profile.completedCases.length}/${archiveCases.length} files resolved · ${rememberedMoments} remembered moments` : "A separate campaign and memory."}</p>
      </div>
      <button class="button primary" data-action="select-profile" data-id="${profile.id}">${runLabel}</button>
      ${occupied ? `<button class="text-button danger" data-action="reset-profile" data-id="${profile.id}">Reset this profile</button>` : ""}
    </article>`;
  }).join("");

  return `<main class="screen title-screen">
    <header class="masthead">
      <div class="masthead-utility"><p class="eyebrow">A narrative roguelike prototype</p>${readingControl()}</div>
      <h1>The Night-Shift <em>Archive</em></h1>
      <p class="intro">Unfinished stories gather after dark. Decide what the archive should remember.</p>
    </header>
    <section class="profile-list" aria-label="Save profiles">${slots}</section>
    <p class="footnote">Saves stay in this browser and site. Facts and NPC memories persist; shift resources reset between shifts.</p>
  </main>`;
}

function campaignMap(profile: Profile): string {
  const filedCases = archiveCases.filter((archiveCase) =>
    profile.completedCases.includes(archiveCase.id),
  ).length;
  const totalEndings = archiveCases.reduce(
    (count, archiveCase) => count + archiveCase.resolutions.length,
    0,
  );
  const foundEndings = archiveCases.reduce(
    (count, archiveCase) =>
      count + archiveCase.resolutions.filter((resolution) => profile.facts.includes(resolution.fact)).length,
    0,
  );
  const chapters = chapterNames.map((chapterName, index) => {
    const chapter = index + 1;
    const cases = archiveCases.filter((archiveCase) => archiveCase.chapter === chapter);
    const filedInChapter = cases.filter((archiveCase) =>
      profile.completedCases.includes(archiveCase.id),
    ).length;
    const chapterStatus = filedInChapter === cases.length
      ? "Filed"
      : chapter === profile.chapter
        ? "Open"
        : chapter < profile.chapter
          ? "Earlier"
          : "Locked";
    const caseItems = cases.map((archiveCase) => {
      const filed = profile.completedCases.includes(archiveCase.id);
      const available = !filed && chapter === profile.chapter;
      const endingsFound = archiveCase.resolutions.filter((resolution) =>
        profile.facts.includes(resolution.fact),
      ).length;
      const caseName = available
        ? `<a class="campaign-map-link" href="#case-${escapeHtml(archiveCase.id)}">${escapeHtml(archiveCase.title)}</a>`
        : `<strong>${escapeHtml(archiveCase.title)}</strong>`;
      const status = filed
        ? "Filed"
        : available
          ? "Open this chapter"
          : `Locked until Chapter ${chapter}`;
      return `<li class="campaign-map-case ${filed ? "filed" : available ? "available" : "locked"}">
        <span class="campaign-map-marker" aria-hidden="true">${filed ? "✓" : String(chapter).padStart(2, "0")}</span>
        <div>${caseName}<small>${status} · ${endingsFound}/${archiveCase.resolutions.length} endings found</small></div>
      </li>`;
    }).join("");
    return `<section class="campaign-map-chapter">
      <header><h3>${escapeHtml(chapterName)}</h3><span>${chapterStatus} · ${filedInChapter}/${cases.length}</span></header>
      <ol>${caseItems}</ol>
    </section>`;
  }).join("");
  return `<details class="campaign-map">
    <summary><span>Campaign map</span><small>${filedCases}/${archiveCases.length} cases filed · ${foundEndings}/${totalEndings} endings found</small></summary>
    <p class="campaign-map-intro">Open cases can be pursued in either order. File every case in a chapter to unlock the next; replay to explore other endings.</p>
    <div class="campaign-map-chapters">${chapters}</div>
  </details>`;
}

function hubScreen(profile: Profile, run: RunState): string {
  const chapterCases = archiveCases.filter(
    (archiveCase) =>
      archiveCase.chapter === profile.chapter &&
      !profile.completedCases.includes(archiveCase.id),
  );
  const caseCards = chapterCases.map((archiveCase) => {
    const resolved = run.resolvedCases.includes(archiveCase.id);
    const canEnter = run.time >= 2;
    return `<article class="case-card ${resolved ? "resolved" : ""}" id="case-${escapeHtml(archiveCase.id)}">
      <div class="case-number">${resolved ? "FILED" : "CASE"}</div>
      <h3>${archiveCase.title}</h3>
      <p>${archiveCase.summary}</p>
      <p class="person"><strong>${archiveCase.character}</strong> · ${archiveCase.role}</p>
      <button class="button ${resolved ? "quiet" : "primary"}" data-action="open-case" data-id="${archiveCase.id}" ${resolved || !canEnter ? "disabled" : ""}>
        ${resolved ? "Case resolved" : canEnter ? "Plan this case · 1 time" : "Need 2 time to resolve"}
      </button>
    </article>`;
  }).join("");
  const nextChapter = profile.chapter > chapterNames.length || campaignComplete(profile);
  const chapterComplete = chapterCases.length === 0 && !campaignComplete(profile);
  return `<main class="screen">
    <header class="topline">
      <div><p class="eyebrow">PROFILE ${profile.id} · NIGHT ${profile.loopCount} · CHAPTER ${Math.min(profile.chapter, chapterNames.length)}</p><h1>${nextChapter ? "The archive is quiet" : chapterNames[Math.max(0, profile.chapter - 1)]}</h1></div>
      <div class="topline-actions">${readingControl()}<button class="text-button" data-action="profiles">Change profile</button></div>
    </header>
    ${resourceBar(run)}
    <section class="narrative-panel">
      <p class="eyebrow">${nextChapter ? "CAMPAIGN COMPLETE" : chapterComplete ? "CHAPTER FILED" : "YOUR SHIFT"}</p>
      <p>${nextChapter ? "Every case has an ending. The index leaves one line open for another night." : chapterComplete ? "The chapter's open cases are filed. Close the shift to enter the next wing." : "Choose the files this shift can afford. Unresolved cases wait for another night."}</p>
      ${profile.currentFacts.length ? `<p class="memory-note"><strong>What you carry this campaign:</strong> ${profile.currentFacts.map(escapeHtml).join(" · ")}</p>` : ""}
    </section>
    ${run.outcome ? `<section class="narrative-panel outcome" aria-live="polite"><p class="eyebrow">CASE OUTCOME</p><p>${escapeHtml(run.outcome)}</p></section>` : ""}
    ${profile.loopCount === 1 && profile.completedCases.length === 0 ? `<details class="guide-panel optional-guide">
      <summary>Shift rules <span>(optional)</span></summary>
      <p>Each shift starts with 5 Time, 4 Composure, and 1 Favor. Entering a case costs 1 Time; its planned lead reduces its own Time cost by 1. Social leads cost a Favor. Risky leads cost Composure and return Time. Resolve a clue for 1 Time. At zero Time or Composure, the shift ends.</p>
    </details>
    ` : ""}
    ${campaignMap(profile)}
    ${caseCards ? `<section class="case-grid" aria-label="Available cases">${caseCards}</section>` : ""}
    ${!chapterComplete && !nextChapter && run.time < 2 ? `<p class="helper">Not enough Time to enter and resolve another case tonight.</p>` : ""}
    <div class="actions-row"><button class="button secondary" data-action="end-shift">${chapterComplete || nextChapter ? "Close shift" : "End shift"}</button></div>
  </main>`;
}

function planningScreen(profile: Profile, run: RunState): string {
  const archiveCase = getActiveCase(run);
  if (!archiveCase) return hubScreen(profile, run);
  const approaches = archiveCase.approaches.map((approach) => {
    const leadAction = archiveCase.actions.find((action) => action.id === approach.actionId);
    if (!leadAction) return "";
    const plannedRun = { ...run, approach: approach.label };
    const leadCost = getActionCost(plannedRun, leadAction);
    const clueRun = { ...plannedRun, clues: [...run.clues, leadAction.clue] };
    const previewResolution = archiveCase.resolutions.find((resolution) => hasClue(clueRun, resolution.clue));
    const socialReward =
      previewResolution?.socialClue === leadAction.clue ? previewResolution.composureReward ?? 0 : 0;
    const memoryEffect = leadAction.memory
      ? `<small>${escapeHtml(archiveCase.character)} will remember this choice.</small>`
      : "";
    const socialEffect = socialReward
      ? `<small>+${socialReward} Composure on resolve (max 4).</small>`
      : "";
    return `<button class="choice-button ${run.approach === approach.label ? "chosen" : ""}" data-action="approach" data-value="${escapeHtml(approach.label)}">
      <strong>${escapeHtml(approach.label)}</strong>
      <span>Lead: ${escapeHtml(leadAction.label)}${previewResolution ? ` → ${escapeHtml(previewResolution.label)}` : ""}</span>
      <small>${costLabel(leadCost, { matchingLead: true, timeRefund: leadAction.timeRefund })}</small>
      ${memoryEffect}${socialEffect}
    </button>`;
  }).join("");
  return `<main class="screen">
    <div class="screen-toolbar"><button class="text-button back" data-action="back-hub">← Back · +1 entry Time</button>${readingControl()}</div>
    ${resourceBar(run)}
    <section class="case-detail">
      <p class="eyebrow">CASE PLANNING</p>
      <h1>${archiveCase.title}</h1>
      <p class="intro">${archiveCase.summary}</p>
      <div class="character-note">
        <strong>${archiveCase.character} · ${archiveCase.role}</strong>
        <p><strong>Need:</strong> ${escapeHtml(archiveCase.need)}</p>
        <p><strong>Concern:</strong> ${escapeHtml(archiveCase.concern)}</p>
      </div>
    </section>
    <section class="choice-section"><h2>Choose your approach</h2><div class="choice-list">${approaches}</div></section>
    <button class="button primary wide" data-action="begin-investigation" ${run.approach ? "" : "disabled"}>Begin investigation · no cost</button>
  </main>`;
}

function dialogueReaction(
  profile: Profile,
  run: RunState,
  archiveCase: NonNullable<ReturnType<typeof getActiveCase>>,
): DialogueBeat {
  const createBeat = (trigger: string, line: string): DialogueBeat => ({
    key: `${profile.id}:${archiveCase.id}:${trigger}:${line}`,
    speaker: archiveCase.character,
    trigger,
    line,
    expression: trigger.includes("risky")
      ? "uneasy"
      : trigger.includes("Favor")
        ? "open"
        : trigger === "Déjà vu"
          ? "uncanny"
          : trigger === "The ledger remembers"
            ? "reflective"
            : trigger === "After a clue"
              ? "focused"
              : "guarded",
  });
  const socialAction = archiveCase.actions.find((action) => action.memory);
  if (socialAction && run.clues.includes(socialAction.clue)) {
    return createBeat("After you spent a Favor", archiveCase.dialogue.afterFavor);
  }

  const hasRiskyClue = archiveCase.actions.some(
    (action) => action.cost.composure && run.clues.includes(action.clue),
  );
  const hasNonRiskyClue = archiveCase.actions.some(
    (action) => !action.cost.composure && !action.memory && run.clues.includes(action.clue),
  );
  if (hasRiskyClue) {
    return createBeat("After a risky clue", archiveCase.dialogue.afterRiskyClue);
  }
  if (hasNonRiskyClue) {
    return createBeat("After a clue", archiveCase.dialogue.afterNonRiskyClue);
  }

  return createBeat("First meeting", archiveCase.dialogue.firstMeeting);
}

function archiveMemoryNote(
  profile: Profile,
  archiveCase: NonNullable<ReturnType<typeof getActiveCase>>,
): { label: string; line: string } | null {
  for (const fact of profile.currentFacts.slice().reverse()) {
    const reaction = archiveCase.priorFactReactions?.find((item) => item.fact === fact);
    if (reaction) return { label: "The ledger remembers", line: reaction.line };
  }
  if (profile.loopCount >= 2 && profile.npcMemories[archiveCase.characterId] > 0) {
    return { label: "A familiar margin", line: archiveCase.dialogue.dejaVu };
  }
  return null;
}

function actionButton(action: CaseAction, run: RunState): string {
  const known = run.clues.includes(action.clue);
  const cost = getActionCost(run, action);
  const affordable = canAfford(run, cost);
  const matchingLead = (cost.time ?? 0) < (action.cost.time ?? 0);
  const timeAfterAction = Math.min(5, run.time - (cost.time ?? 0) + (action.timeRefund ?? 0));
  const timeWarning =
    timeAfterAction < 1
      ? `<small class="cost-warning">Warning: this leaves 0 time, so you cannot resolve the case afterward.</small>`
      : "";
  const composureAfterAction = run.composure - (cost.composure ?? 0);
  const composureWarning =
    composureAfterAction <= 0
      ? `<small class="cost-warning">Warning: this leaves 0 Composure and ends the shift before you can resolve.</small>`
      : "";
  const archiveCase = getActiveCase(run);
  const memoryEffect = action.memory
    ? `<small>${escapeHtml(archiveCase?.character ?? "They")} will remember this.</small>`
    : "";
  return `<button class="choice-button" data-action="investigate" data-id="${action.id}" ${known || !affordable ? "disabled" : ""}>
    <strong>${escapeHtml(action.label)} ${known ? "· clue found" : ""}</strong>
    <span>${escapeHtml(action.description)}</span>
    <small>${costLabel(cost, { matchingLead, timeRefund: action.timeRefund })}</small>
    ${memoryEffect}
    ${timeWarning}
    ${composureWarning}
  </button>`;
}

function resolutionButton(resolution: Resolution, run: RunState): string {
  const available = canResolve(run, resolution);
  const requirementLabels: Record<string, string> = {
    "bell:ink": "ink or promise clue",
    "bell:echo": "echo clue",
    "voice:script": "label or cadence clue",
    "voice:echo": "recording echo clue",
  };
  const socialReward =
    resolution.socialClue && run.clues.includes(resolution.socialClue)
      ? `<small>+${resolution.composureReward ?? 0} Composure on resolve (max 4).</small>`
      : "";
  return `<button class="choice-button resolution" data-action="resolve-case" data-id="${resolution.id}" ${available ? "" : "disabled"}>
    <strong>${escapeHtml(resolution.label)}</strong>
    <span>${escapeHtml(resolution.description)}</span>
    <small>Requires ${requirementLabels[resolution.clue] ?? "a clue"} · Cost: 1 time</small>
    ${socialReward}
  </button>`;
}

function investigationScreen(profile: Profile, run: RunState): string {
  const archiveCase = getActiveCase(run);
  if (!archiveCase) return hubScreen(profile, run);
  const dialogue = dialogueReaction(profile, run, archiveCase);
  const memoryNote = archiveMemoryNote(profile, archiveCase);
  const actions = archiveCase.actions.map((action) => actionButton(action, run)).join("");
  const resolutions = archiveCase.resolutions.map((resolution) => resolutionButton(resolution, run)).join("");
  const approach = run.approach ? `<p class="selected-lead"><strong>Your lead:</strong> ${escapeHtml(run.approach)}</p>` : "";
  const clues = run.clues
    .filter((clue) => clue.startsWith(`${archiveCase.id}:`))
    .map((clue) => clue.split(":")[1])
    .map((clue) => `<span class="clue-chip">${escapeHtml(clue.replace("-", " "))}</span>`)
    .join("");
  const hasCaseClue = run.clues.some((clue) => clue.startsWith(`${archiveCase.id}:`));
  const clueStatus = hasCaseClue
    ? "Clue ready. Choose an ending."
    : "Pick a lead to find a clue.";
  return `<main class="screen">
    <div class="screen-toolbar"><button class="text-button back" data-action="back-hub">← Leave · +1 entry Time</button>${readingControl()}</div>
    ${resourceBar(run)}
    <section class="case-detail">
      <p class="eyebrow">INVESTIGATION · ${archiveCase.character.toUpperCase()}</p>
      <h1>${archiveCase.title}</h1>
      ${approach}
      <div class="character-note character-context">
        <strong>${archiveCase.character} · ${archiveCase.role}</strong>
      </div>
      ${memoryNote ? `<aside class="ledger-note"><strong>${escapeHtml(memoryNote.label)}:</strong> ${escapeHtml(memoryNote.line)}</aside>` : ""}
      ${renderDialoguePanel(dialogue, profile.id)}
      ${clues ? `<div class="clue-list" aria-label="Discovered clues">${clues}</div>` : ""}
    </section>
    <p class="helper" aria-live="polite">${clueStatus}</p>
    <section class="choice-section"><h2>Investigate or talk</h2><div class="choice-list">${actions}</div></section>
    <section class="choice-section"><h2>Resolve</h2><div class="choice-list">${resolutions}</div></section>
  </main>`;
}

function summaryScreen(profile: Profile, run: RunState): string {
  const finished = run.resolvedCases.length
    ? archiveCases.filter((archiveCase) => run.resolvedCases.includes(archiveCase.id)).map((archiveCase) => archiveCase.title)
    : [];
  const history = run.history.map((entry) => `<li>${escapeHtml(entry)}</li>`).join("");
  const facts = profile.facts.map((fact) => `<li>${escapeHtml(fact)}</li>`).join("");
  const failed =
    run.endReason?.startsWith("Your composure") ||
    run.endReason?.startsWith("Morning reaches");
  const complete = campaignComplete(profile);
  const wroteFinalEntry = run.history.some((entry) => entry.includes("Write your own unfinished entry"));
  const campaignEnding = wroteFinalEntry
    ? {
        title: "The index knows your name.",
        text: "Your unfinished entry remains in the archive by choice. The next reader can decide what to do with it.",
      }
    : {
        title: "The index stays open.",
        text: "You have filed every case and left the final line open for another reader.",
      };
  const finishedChapterCases = archiveCases.filter((archiveCase) => archiveCase.chapter === profile.chapter);
  const chapterFiled =
    finishedChapterCases.length > 0 &&
    finishedChapterCases.every((archiveCase) => profile.completedCases.includes(archiveCase.id));
  const nextChapter = chapterFiled ? profile.chapter + 1 : profile.chapter;
  const remembered = Object.entries(profile.npcMemories)
    .filter(([, count]) => count > 0)
    .map(([name, count]) => `${name[0].toUpperCase()}${name.slice(1)} ×${count}`);
  return `<main class="screen summary-screen">
    <div class="summary-toolbar"><p class="eyebrow">SHIFT ${profile.loopCount} · SUMMARY</p>${readingControl()}</div>
    <h1>${complete ? campaignEnding.title : "Morning has arrived."}</h1>
    <p class="intro">${complete ? campaignEnding.text : escapeHtml(run.endReason ?? "The shift is over.")}</p>
    ${resourceBar(run)}
    ${run.outcome ? `<section class="narrative-panel outcome"><p class="eyebrow">LAST CASE</p><p>${escapeHtml(run.outcome)}</p></section>` : ""}
    <section class="summary-card">
      <h2>Filed this shift</h2>
      ${finished.length ? `<ul>${finished.map((title) => `<li>${escapeHtml(title)}</li>`).join("")}</ul>` : "<p>No cases were fully resolved this time.</p>"}
      <p>${run.clues.length} clue${run.clues.length === 1 ? "" : "s"} recorded · ${profile.facts.length} persistent fact${profile.facts.length === 1 ? "" : "s"}</p>
    </section>
    <section class="summary-card">
      <h2>Shift log</h2>
      ${history ? `<ol>${history}</ol>` : "<p>No actions were recorded.</p>"}
    </section>
    <section class="summary-card">
      <h2>Campaign record</h2>
      ${facts ? `<ul>${facts}</ul>` : "<p>No lasting facts discovered yet.</p>"}
      <p>${profile.completedCases.length}/${archiveCases.length} cases filed · ${profile.currentFacts.length} fact${profile.currentFacts.length === 1 ? "" : "s"} this campaign · ${remembered.length ? escapeHtml(remembered.join(" · ")) : "No NPC memories yet."}</p>
    </section>
    <button class="button primary wide" data-action="${complete ? "replay-campaign" : "next-shift"}">${complete ? "Replay campaign · keep memories" : failed ? "Restart shift" : `Continue to chapter ${Math.min(nextChapter, chapterNames.length)}`}</button>
    <button class="text-button centered" data-action="profiles">Return to profiles</button>
  </main>`;
}

function render(): void {
  document.documentElement.classList.toggle("large-text", largeText);
  const profile = selectedProfile();
  document.documentElement.dataset.chapter = profile?.run
    ? String(Math.max(1, Math.min(profile.chapter, chapterNames.length)))
    : "title";
  if (!profile || !profile.run) {
    appRoot.innerHTML = profileScreen();
    renderPersistenceNotice();
    afterDialogueRender(false);
    return;
  }
  const run = profile.run;
  switch (run.scene) {
    case "hub":
      appRoot.innerHTML = hubScreen(profile, run);
      break;
    case "planning":
      appRoot.innerHTML = planningScreen(profile, run);
      break;
    case "investigation":
      appRoot.innerHTML = investigationScreen(profile, run);
      break;
    case "summary":
      appRoot.innerHTML = summaryScreen(profile, run);
      break;
  }
  renderPersistenceNotice();
  afterDialogueRender(run.scene === "investigation");
}

function startShift(profile: Profile, isFirstShift: boolean): void {
  const currentChapterCases = archiveCases.filter((archiveCase) => archiveCase.chapter === profile.chapter);
  if (
    currentChapterCases.length > 0 &&
    currentChapterCases.every((archiveCase) => profile.completedCases.includes(archiveCase.id))
  ) {
    profile.chapter += 1;
  }
  if (isFirstShift) profile.loopCount = 1;
  else profile.loopCount += 1;
  profile.run = newRun();
  persist();
  render();
}

function closeCase(profile: Profile, run: RunState, resolution: Resolution): void {
  const archiveCase = getActiveCase(run);
  if (!archiveCase) return;
  payCost(run, { time: 1 });
  let restoredComposure = 0;
  if (resolution.socialClue && run.clues.includes(resolution.socialClue)) {
    restoredComposure = Math.min(
      resolution.composureReward ?? 0,
      4 - run.composure,
    );
    run.composure += restoredComposure;
  }
  run.resolvedCases.push(archiveCase.id);
  if (!profile.completedCases.includes(archiveCase.id)) {
    profile.completedCases.push(archiveCase.id);
  }
  run.outcome = resolution.outcome;
  run.history.push(`Resolved ${archiveCase.title}: ${resolution.label}.`);
  if (restoredComposure > 0) {
    run.history.push(`Shared trust restored ${restoredComposure} Composure.`);
  }
  if (!profile.facts.includes(resolution.fact)) profile.facts.push(resolution.fact);
  if (!profile.currentFacts.includes(resolution.fact)) profile.currentFacts.push(resolution.fact);
  run.activeCaseId = null;
  run.approach = null;
  run.scene = "hub";
  const failure = checkFailure(run);
  if (failure) finishShift(run, failure);
}

app.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof Element)) return;
  const button = target.closest<HTMLButtonElement>("button[data-action]");
  if (!button || button.disabled) return;
  const action = button.dataset.action;
  const id = Number(button.dataset.id);
  const profile = selectedProfile();

  if (handleDialogueAction(action, button.dataset.id, render)) return;
  if (action === "toggle-reading") {
    largeText = !largeText;
    try {
      localStorage.setItem(TEXT_SIZE_KEY, largeText ? "large" : "standard");
    } catch (error) {
      console.warn("Could not save the text-size preference.", error);
    }
    render();
    appRoot.querySelector<HTMLButtonElement>('[data-action="toggle-reading"]')?.focus();
    return;
  }
  if (action === "profiles") {
    activeProfileId = null;
    render();
    return;
  }
  if (action === "select-profile") {
    const selected = profiles.find((item) => item.id === id);
    if (!selected) return;
    activeProfileId = selected.id;
    if (selected.run?.scene === "summary" && campaignComplete(selected)) {
      render();
    } else if (!selected.run || selected.run.scene === "summary") {
      startShift(selected, selected.loopCount === 0);
    } else {
      render();
    }
    return;
  }
  if (action === "reset-profile") {
    if (!window.confirm(`Permanently erase profile ${id} and its memories?`)) return;
    profiles = profiles.map((item) => item.id === id ? emptyProfile(id) : item);
    if (activeProfileId === id) activeProfileId = null;
    persist();
    render();
    return;
  }
  if (!profile?.run) return;
  const run = profile.run;

  if (action === "next-shift") {
    startShift(profile, false);
  } else if (action === "replay-campaign") {
    profile.chapter = 1;
    profile.completedCases = [];
    profile.currentFacts = [];
    startShift(profile, false);
  } else if (action === "open-case") {
    const archiveCase = archiveCases.find((item) => item.id === button.dataset.id);
    if (
      !archiveCase ||
      archiveCase.chapter !== profile.chapter ||
      profile.completedCases.includes(archiveCase.id) ||
      run.resolvedCases.includes(archiveCase.id) ||
      run.time < 2
    ) return;
    payCost(run, { time: 1 });
    run.history.push(`Entered ${archiveCase.title}.`);
    run.activeCaseId = archiveCase.id;
    run.approach = null;
    run.scene = "planning";
    const failure = checkFailure(run);
    if (failure) finishShift(run, failure);
    persist();
    render();
  } else if (action === "approach") {
    run.approach = button.dataset.value ?? null;
    persist();
    render();
  } else if (action === "begin-investigation") {
    if (!run.approach) return;
    run.history.push(`Planned lead: ${run.approach}.`);
    run.scene = "investigation";
    persist();
    render();
  } else if (action === "investigate") {
    const archiveCase = getActiveCase(run);
    const selectedAction = archiveCase?.actions.find((item) => item.id === button.dataset.id);
    if (!selectedAction || !canAfford(run, getActionCost(run, selectedAction)) || run.clues.includes(selectedAction.clue)) return;
    applyAction(profile, run, selectedAction);
    run.history.push(`Pursued: ${selectedAction.label}.`);
    const failure = checkFailure(run);
    if (failure) finishShift(run, failure);
    persist();
    render();
  } else if (action === "resolve-case") {
    const archiveCase = getActiveCase(run);
    const resolution = archiveCase?.resolutions.find((item) => item.id === button.dataset.id);
    if (!resolution || !canResolve(run, resolution)) return;
    closeCase(profile, run, resolution);
    persist();
    render();
  } else if (action === "back-hub") {
    const archiveCase = getActiveCase(run);
    if (archiveCase) {
      run.time = Math.min(5, run.time + 1);
      run.history.push(`Left ${archiveCase.title}; entry Time refunded.`);
    }
    run.activeCaseId = null;
    run.approach = null;
    run.scene = "hub";
    persist();
    render();
  } else if (action === "end-shift") {
    run.history.push("Closed the shift early.");
    finishShift(run, "You choose to close the ledger early and leave the unanswered stories for another night.");
    persist();
    render();
  }
});

appRoot.addEventListener("change", (event) => {
  handleDialogueChange(event.target, render);
});

document.addEventListener("keydown", (event) => {
  handleDialogueKeydown(
    event,
    selectedProfile()?.run?.scene === "investigation",
    render,
  );
});

render();
