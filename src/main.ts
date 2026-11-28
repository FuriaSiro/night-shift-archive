// @ts-ignore CSS is loaded by the bundler; TypeScript has no CSS module declaration.
import "./styles.css";
import { archiveCases, type ArchiveCase } from "./content/cases";
import {
  shiftOrders,
  type CaseAction,
  type Cost,
  type Profile,
  type Resolution,
  type RunState,
} from "./game/types";
import {
  afterDialogueRender,
  handleDialogueAction,
  handleDialogueChange,
  handleDialogueKeydown,
  renderDialoguePanel,
  type DialogueBeat,
} from "./ui/dialogue";
import {
  loadProfiles,
  saveProfiles,
  emptyProfile,
  startFreshPreservingRecovery,
} from "./game/save";
import {
  archiveMapSeed,
  archiveRoomDefinitions,
  createArchiveMap,
  drawArchiveMap,
  findArchivePath,
  isMapWalkable,
  visibleArchiveCells,
  type ArchiveMap,
  type ArchiveRoomId,
  type MapPosition,
} from "./game/archiveMap";
import {
  applyAction,
  canApplyAction,
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

const loadedProfiles = loadProfiles();
let profiles = loadedProfiles.profiles;
let saveRecovery = loadedProfiles.recovery;
let activeProfileId: number | null = null;
let largeText = loadLargeTextPreference();
let persistenceError = loadedProfiles.persistenceError;
let recoveryActionError: string | null = null;

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

function unfiledClueCount(profile: Profile, run: RunState, caseId?: string): number {
  return run.clues.filter((clue) => {
    const clueCaseId = clue.split(":")[0];
    return (!caseId || clueCaseId === caseId) &&
      !profile.completedCases.includes(clueCaseId) &&
      !run.resolvedCases.includes(clueCaseId);
  }).length;
}

function unfiledClueNotice(profile: Profile, run: RunState, caseId?: string): string {
  const count = unfiledClueCount(profile, run, caseId);
  if (!count) return "";
  const label = `${count} unfiled clue${count === 1 ? "" : "s"}`;
  const message = caseId
    ? `${label} will remain available if you return this shift, but reset if the case is not filed tonight.`
    : `${label} from unresolved cases ${count === 1 ? "resets" : "reset"} when this shift ends.`;
  return `<p class="unfiled-clue-warning" role="status" tabindex="-1">${message}</p>`;
}

function persist(): void {
  if (saveRecovery) return;
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

function caseProgressLabel(archiveCase: ArchiveCase): string {
  const caseNumber = archiveCases.indexOf(archiveCase) + 1;
  return `Chapter ${archiveCase.chapter} of ${chapterNames.length} · Case ${caseNumber} of ${archiveCases.length}`;
}

function profileProgressLabel(profile: Profile): string {
  const activeCase = profile.run?.activeCaseId
    ? archiveCases.find((archiveCase) => archiveCase.id === profile.run?.activeCaseId)
    : undefined;
  const nextCase = activeCase ?? archiveCases.find(
    (archiveCase) => !profile.completedCases.includes(archiveCase.id),
  );
  const chapter = nextCase?.chapter ?? Math.min(profile.chapter, chapterNames.length);
  const caseNumber = nextCase ? archiveCases.indexOf(nextCase) + 1 : archiveCases.length;
  return `Chapter ${chapter} of ${chapterNames.length} · Case ${caseNumber} of ${archiveCases.length}`;
}

function profileSavedLocation(profile: Profile): string {
  const run = profile.run;
  if (!run) return "Campaign ready";
  if (run.scene === "summary") return "Shift summary";
  if (run.scene === "hub") return "Archive hub";
  const archiveCase = archiveCases.find((item) => item.id === run.activeCaseId);
  if (!archiveCase) return "Current shift";
  return `${archiveCase.title} · ${run.scene === "planning" ? "Planning" : "Investigation"}`;
}

function profileScreen(): string {
  if (saveRecovery) {
    return `<main class="screen title-screen">
      <header class="masthead">
        <p class="eyebrow">SAVE RECOVERY</p>
        <h1>This file needs <em>care</em>.</h1>
        <p class="intro">The saved archive could not be read. It has not been changed. Download a copy before choosing to start fresh.</p>
      </header>
      <section class="save-recovery" role="alert">
        <h2>Original save preserved</h2>
        <p>${escapeHtml(saveRecovery.reason)}</p>
        ${recoveryActionError ? `<p class="recovery-error">${escapeHtml(recoveryActionError)}</p>` : ""}
        <div class="recovery-actions">
          <button class="button secondary" data-action="download-save">Download original save</button>
          <button class="button primary" data-action="fresh-after-recovery">Start fresh · preserve backup</button>
        </div>
      </section>
    </main>`;
  }
  const slots = profiles.map((profile) => {
    const occupied = profile.loopCount > 0;
    const complete = campaignComplete(profile);
    const profileState = !occupied
      ? "EMPTY SLOT"
      : complete
        ? profile.run?.scene === "summary" ? "ENDING READY" : "CAMPAIGN COMPLETE"
        : profile.run?.scene === "summary" ? "SHIFT SUMMARY READY" : "IN PROGRESS";
    const runLabel = profile.run?.scene === "summary"
      ? campaignComplete(profile) ? "Review campaign ending" : "Review last shift"
      : campaignComplete(profile)
        ? "Replay campaign · memories kept"
        : profile.run
          ? "Continue current shift"
          : occupied
            ? "Continue campaign"
            : "Start a new profile";
    const rememberedMoments = Object.values(profile.npcMemories).reduce((total, count) => total + count, 0);
    return `<article class="profile-card ${occupied ? "" : "empty"}">
      <div>
        <p class="eyebrow">${profileState}</p>
        <h2>Profile ${String(profile.id).padStart(2, "0")}</h2>
        <p>${occupied ? `${profileProgressLabel(profile)} · ${profile.completedCases.length}/${archiveCases.length} filed · ${rememberedMoments} remembered` : "An empty slot · a separate campaign and memory."}</p>
        <p class="profile-save-location">${occupied ? `LAST SAVED · ${escapeHtml(profileSavedLocation(profile))}` : "READY FOR A NEW CAMPAIGN"}</p>
      </div>
      <button class="button ${occupied ? "primary" : "secondary"}" data-action="select-profile" data-id="${profile.id}">${runLabel}</button>
      ${occupied ? `<button class="text-button danger" data-action="reset-profile" data-id="${profile.id}" aria-label="Reset profile ${profile.id}">Reset this profile</button>` : ""}
    </article>`;
  }).join("");

  return `<main class="screen title-screen">
    <header class="masthead">
      <div class="masthead-utility"><p class="eyebrow">V2.3 · Night Council update</p>${readingControl()}</div>
      <h1>The Night-Shift <em>Archive</em></h1>
      <p class="intro">Unfinished stories gather after dark. Decide what the archive should remember.</p>
    </header>
    <section class="profile-list" aria-label="Save profiles">${slots}</section>
    <p class="footnote">Saves stay in this browser and site. Facts and NPC memories persist; shift resources reset between shifts.</p>
  </main>`;
}

function shiftOrderPanel(run: RunState): string {
  if (run.briefingComplete) {
    const order = shiftOrders.find((item) => item.id === run.shiftOrder);
    if (!order) return "";
    const status = run.shiftOrderUsed ? "Order used" : "Order ready";
    return `<section class="shift-order-status" aria-label="Active shift order">
      <p class="eyebrow">${status} · NIGHT COUNCIL</p>
      <strong>${order.label}</strong><span>${order.description}</span>
    </section>`;
  }
  return `<section class="shift-council" aria-labelledby="shift-council-title">
    <p class="eyebrow">NIGHT COUNCIL · ONE ORDER THIS SHIFT</p>
    <h2 id="shift-council-title">Where should the staff focus?</h2>
    <p>Choose one support order before opening a case. Each has a different use; you can close the shift without choosing.</p>
    <div class="shift-order-list">${shiftOrders.map((order) => `<button class="shift-order-option" data-action="shift-order" data-id="${order.id}">
      <strong>${order.label}</strong><span>${order.description}</span>
    </button>`).join("")}</div>
  </section>`;
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
    const savedClueCount = run.clues.filter((clue) => clue.startsWith(`${archiveCase.id}:`)).length;
    const freeEntry = run.shiftOrder === "fast-index" && !run.shiftOrderUsed;
    const entryCost = freeEntry ? 0 : 1;
    const canEnter = run.briefingComplete && run.time >= entryCost + 1;
    return `<article class="case-card ${resolved ? "resolved" : ""}" id="case-${escapeHtml(archiveCase.id)}">
      <div class="case-number">${resolved ? "FILED" : "CASE"}</div>
      <h3>${archiveCase.title}</h3>
      <p>${archiveCase.summary}</p>
      <p class="person"><strong>${archiveCase.character}</strong> · ${archiveCase.role}</p>
      ${savedClueCount ? `<p class="case-progress-note">${savedClueCount} clue${savedClueCount === 1 ? "" : "s"} saved this shift · this progress resets when the shift ends.</p>` : ""}
      <button class="button ${resolved ? "quiet" : "primary"}" data-action="open-case" data-id="${archiveCase.id}" ${resolved || !canEnter ? "disabled" : ""}>
        ${resolved ? "Case resolved" : !run.briefingComplete ? "Choose a night order first" : canEnter ? `${savedClueCount ? "Resume this case" : "Plan this case"} · ${freeEntry ? "no entry Time" : "1 Time"}` : `Need ${entryCost + 1} Time to enter`}
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
    ${shiftOrderPanel(run)}
    ${resourceBar(run)}
    <section class="narrative-panel">
      <p class="eyebrow">${nextChapter ? "CAMPAIGN COMPLETE" : chapterComplete ? "CHAPTER FILED" : "YOUR SHIFT"}</p>
      <p>${nextChapter ? "Every case has an ending. The index leaves one line open for another night." : chapterComplete ? "The chapter's open cases are filed. Close the shift to enter the next wing." : "Choose the files this shift can afford. Unresolved cases wait for another night."}</p>
      ${profile.currentFacts.length ? `<p class="memory-note"><strong>What you carry this campaign:</strong> ${profile.currentFacts.map(escapeHtml).join(" · ")}</p>` : ""}
    </section>
    ${run.outcome ? `<section class="narrative-panel outcome" aria-live="polite"><p class="eyebrow">CASE OUTCOME</p><p>${escapeHtml(run.outcome)}</p></section>` : ""}
    ${profile.loopCount === 1 && profile.completedCases.length === 0 ? `<details class="guide-panel optional-guide">
      <summary>Shift rules <span>(optional)</span></summary>
      <p>Each shift starts with 5 Time, 4 Composure, and 1 Favor. First choose one Night Council order: gain 1 Favor, waive the first case's entry Time, or reduce the first risky lead's Composure cost by 1. Entering a case otherwise costs 1 Time; your planned lead reduces its own Time cost by 1. Social leads cost a Favor. Risky leads return Time. Resolve a clue for 1 Time. At zero Time or Composure, the shift ends.</p>
    </details>
    ` : ""}
    ${campaignMap(profile)}
    ${caseCards ? `<section class="case-grid" aria-label="Available cases">${caseCards}</section>` : ""}
    ${!chapterComplete && !nextChapter && run.time < 2 ? `<p class="helper">Not enough Time to enter and resolve another case tonight.</p>` : ""}
    ${unfiledClueNotice(profile, run)}
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
    return `<button class="choice-button ${run.approach === approach.label ? "chosen" : ""}" data-action="approach" data-value="${escapeHtml(approach.label)}" aria-pressed="${run.approach === approach.label}">
      <strong>${escapeHtml(approach.label)}</strong>
      <span>Lead: ${escapeHtml(leadAction.label)}${previewResolution ? ` → ${escapeHtml(previewResolution.label)}` : ""}</span>
      <small>${costLabel(leadCost, { matchingLead: true, timeRefund: leadAction.timeRefund })}</small>
      ${memoryEffect}${socialEffect}
    </button>`;
  }).join("");
  return `<main class="screen">
    <div class="screen-toolbar"><button class="text-button back" data-action="back-hub">${run.entryTimePaid ? "← Back · +1 entry Time" : "← Back · no entry Time refund"}</button>${readingControl()}</div>
    ${shiftOrderPanel(run)}
    ${resourceBar(run)}
    <section class="case-detail">
      <p class="eyebrow case-progress">${caseProgressLabel(archiveCase)}</p>
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

function presentedEvidenceResponse(
  archiveCase: NonNullable<ReturnType<typeof getActiveCase>>,
  run: RunState,
): string | null {
  if (!run.presentedClue) return null;
  const clueRun = { ...run, clues: [...run.clues, run.presentedClue] };
  const supportedResolution = archiveCase.resolutions.find((item) =>
    hasClue(clueRun, item.clue),
  );
  const clueName = run.presentedClue.split(":")[1].replace(/-/g, " ");
  return supportedResolution
    ? `This ${clueName} record could support “${supportedResolution.label}.” We still have to choose what it means.`
    : `I see the ${clueName} record. Let's keep to what it can actually tell us.`;
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
  if (run.selectedInterviewId) {
    const topic = archiveCase.interviewTopics.find((item) => item.id === run.selectedInterviewId);
    if (topic) return createBeat("Interview topic", topic.response);
  }
  const evidenceResponse = presentedEvidenceResponse(archiveCase, run);
  if (evidenceResponse) return createBeat("Evidence presented", evidenceResponse);
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
  const affordable = canApplyAction(run, action);
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
  const existingUnfiledClues = archiveCase
    ? run.clues.filter((clue) => clue.startsWith(`${archiveCase.id}:`)).length
    : 0;
  const clueResetWarning =
    existingUnfiledClues > 0 && (timeAfterAction < 1 || composureAfterAction <= 0)
      ? `<small class="cost-warning">${existingUnfiledClues} existing unfiled clue${existingUnfiledClues === 1 ? "" : "s"} will reset when this shift ends.</small>`
      : "";
  const memoryEffect = action.memory
    ? `<small>${escapeHtml(archiveCase?.character ?? "They")} will remember this.</small>`
    : "";
  const actionName = action.inspection ? "inspect-record" : "investigate";
  return `<button class="choice-button" data-action="${actionName}" data-id="${escapeHtml(action.id)}" ${known || !affordable ? "disabled" : ""}>
    <strong>${action.inspection ? "Inspect document: " : ""}${escapeHtml(action.label)} ${known ? "· clue found" : ""}</strong>
    <span>${escapeHtml(action.description)}</span>
    <small>${costLabel(cost, { matchingLead, timeRefund: action.timeRefund })}</small>
    ${memoryEffect}
    ${timeWarning}
    ${composureWarning}
    ${clueResetWarning}
  </button>`;
}

function inspectionPanel(run: RunState): string {
  const archiveCase = getActiveCase(run);
  const action = archiveCase?.actions.find((item) => item.id === run.inspectionActionId);
  if (!action?.inspection) return "";
  const inspection = action.inspection;
  const options = inspection.options.map((option, index) =>
    `<button class="choice-button inspection-option" data-action="inspect-answer" data-id="${index}">
      <strong>${escapeHtml(option)}</strong>
    </button>`,
  ).join("");
  return `<section class="inspection-panel" aria-labelledby="inspection-title">
    <div class="inspection-heading">
      <div><p class="eyebrow">DOCUMENT COMPARISON</p><h3 id="inspection-title" tabindex="-1">${escapeHtml(action.label)}</h3></div>
      <button class="text-button" data-action="cancel-inspection">Close document</button>
    </div>
    <p>${escapeHtml(inspection.question)}</p>
    <div class="document-versions">
      <blockquote><small>EARLIER COPY</small>${escapeHtml(inspection.versionA)}</blockquote>
      <blockquote><small>LATER COPY</small>${escapeHtml(inspection.versionB)}</blockquote>
    </div>
    ${run.inspectionFeedback ? `<p class="inspection-feedback" role="status" tabindex="-1">${escapeHtml(run.inspectionFeedback)}</p>` : ""}
    <div class="choice-list">${options}</div>
  </section>`;
}

function roomActionList(
  archiveCase: NonNullable<ReturnType<typeof getActiveCase>>,
  run: RunState,
  room: ArchiveRoomId,
  currentRoom: ArchiveRoomId | null,
): string {
  if (currentRoom !== room) return `<p class="room-empty">Navigate here to examine this room.</p>`;
  const actions = archiveCase.actions.filter((action) => {
    if (room === "records-desk") return Boolean(action.inspection);
    if (room === "restricted-stacks") return Boolean(action.cost.composure);
    if (room === "reading-room") return false;
    return Boolean(action.memory);
  });
  return actions.length
    ? `<div class="choice-list">${actions.map((action) => actionButton(action, run)).join("")}</div>`
    : `<p class="room-empty">Nothing new to examine here.</p>`;
}

function evidenceRoom(
  archiveCase: NonNullable<ReturnType<typeof getActiveCase>>,
  run: RunState,
  currentRoom: ArchiveRoomId | null,
): string {
  const clues = run.clues.filter((clue) => clue.startsWith(`${archiveCase.id}:`));
  const interviewTopics = archiveCase.interviewTopics.map((topic) => {
    const asked = run.interviewedTopics.includes(topic.id);
    const selected = run.selectedInterviewId === topic.id;
    return `<button class="interview-topic ${selected ? "selected" : ""}" data-action="ask-topic" data-id="${escapeHtml(topic.id)}" aria-pressed="${selected}">
      <strong>${escapeHtml(topic.label)}</strong>
      <small>${asked ? "Ask again" : "Ask in confidence"}</small>
    </button>`;
  }).join("");
  const response = currentRoom === "reading-room"
    ? run.selectedInterviewId
      ? archiveCase.interviewTopics.find((topic) => topic.id === run.selectedInterviewId)?.response ?? null
      : presentedEvidenceResponse(archiveCase, run)
    : null;
  const evidence = currentRoom !== "reading-room"
    ? `<p class="room-empty">Navigate here to present evidence to ${escapeHtml(archiveCase.character)}.</p>`
    : clues.length
      ? `<div class="evidence-options">${clues.map((clue) => {
          const label = clue.split(":")[1].replace(/-/g, " ");
          const selected = run.presentedClue === clue;
          return `<button class="evidence-button ${selected ? "chosen" : ""}" data-action="present-evidence" data-id="${escapeHtml(clue)}" aria-pressed="${selected}">
            <strong>${escapeHtml(label)}</strong><small>${selected ? "Presented" : "Present this clue"}</small>
          </button>`;
        }).join("")}</div>`
      : `<p class="room-empty">Bring a clue here to discuss it with ${escapeHtml(archiveCase.character)}.</p>`;
  return `<article class="archive-room reading-room">
    <p class="room-index">01 · CONVERSATION${currentRoom === "reading-room" ? " · YOU ARE HERE" : ""}</p><h3>Reading Room</h3>
    <p class="room-description">Bring evidence to ${escapeHtml(archiveCase.character)} and see which ending it supports.</p>
    ${currentRoom === "reading-room" ? `<div class="interview-panel"><p class="eyebrow">Interview desk</p><p>Choose a question to set the tone of the conversation. Topics do not spend Time or add clues.</p><div class="interview-topics">${interviewTopics}</div></div>` : ""}
    ${evidence}
    ${response ? `<p class="evidence-response"><strong>${escapeHtml(archiveCase.character)} responds:</strong> ${escapeHtml(response)}</p>` : ""}
  </article>`;
}

function currentMapPosition(map: ArchiveMap, run: RunState): MapPosition {
  return run.mapPosition && isMapWalkable(map, run.mapPosition)
    ? run.mapPosition
    : map.start;
}

function mapPositionDescription(map: ArchiveMap, position: MapPosition): string {
  const room = map.rooms.find((item) =>
    item.position.x === position.x && item.position.y === position.y,
  );
  const directions = [
    { name: "north", x: 0, y: -1 },
    { name: "east", x: 1, y: 0 },
    { name: "south", x: 0, y: 1 },
    { name: "west", x: -1, y: 0 },
  ];
  const openDirections = directions
    .filter((direction) => isMapWalkable(map, {
      x: position.x + direction.x,
      y: position.y + direction.y,
    }))
    .map((direction) => direction.name);
  const walls = directions
    .filter((direction) => !openDirections.includes(direction.name))
    .map((direction) => direction.name);
  const location = room ? `You are at the ${room.label}.` : "You are in a corridor.";
  const exits = openDirections.length
    ? `Open paths: ${openDirections.join(" and ")}.`
    : "No adjacent open paths; use a room destination to travel.";
  const wallDescription = walls.length ? ` Walls: ${walls.join(" and ")}.` : "";
  return `${location} ${exits}${wallDescription} Grid position: row ${position.y + 1}, column ${position.x + 1}.`;
}

function rememberMapPosition(
  run: RunState,
  map: ArchiveMap,
  position: MapPosition,
  route: MapPosition[] = [],
): void {
  const routeCells = route.map((point) => point.y * map.tiles.length + point.x);
  run.mapPosition = position;
  run.mapExplored = [...new Set([
    ...run.mapExplored,
    ...routeCells,
    ...visibleArchiveCells(map, position),
  ])];
}

function renderArchiveCanvas(
  profile: Profile,
  run: RunState,
  archiveCase: NonNullable<ReturnType<typeof getActiveCase>>,
): void {
  const host = appRoot.querySelector<HTMLDivElement>(".rot-map-host");
  if (!host) return;
  const map = createArchiveMap(archiveMapSeed(profile.id, profile.loopCount, archiveCase.id));
  const canvas = drawArchiveMap(map, currentMapPosition(map, run), run.mapExplored);
  if (canvas && canvas.parentElement !== host) host.appendChild(canvas);
}

function mapDestinations(map: ArchiveMap, run: RunState): string {
  const position = currentMapPosition(map, run);
  const currentRoom = map.rooms.find((room) =>
    room.position.x === position.x && room.position.y === position.y,
  );
  return `<div class="archive-map-destinations" role="group" aria-label="Room destinations">
    ${map.rooms.map((room) => {
      const path = findArchivePath(map, position, room.position);
      const isCurrent = currentRoom?.id === room.id;
      const distance = Math.max(0, path.length - 1);
      const detail = isCurrent
        ? "You are here"
        : `${distance} steps · movement uses no Time`;
      return `<button class="map-destination ${isCurrent ? "current" : ""}" data-action="navigate-room" data-id="${room.id}" aria-pressed="${isCurrent}" ${isCurrent || !path.length ? "disabled" : ""}>
        <strong><span aria-hidden="true">${room.glyph}</span> ${room.label}</strong><small>${detail}</small>
      </button>`;
    }).join("")}
  </div>`;
}

function handleArchiveMapKeydown(event: KeyboardEvent): boolean {
  if (event.repeat || !(event.target instanceof HTMLElement)) return false;
  if (!event.target.closest(".rot-map-frame")) return false;
  const controls: Record<string, [number, number]> = {
    ArrowUp: [0, -1],
    ArrowDown: [0, 1],
    ArrowLeft: [-1, 0],
    ArrowRight: [1, 0],
  };
  const direction = controls[event.key];
  if (!direction) return false;
  event.preventDefault();
  appRoot.querySelector<HTMLButtonElement>(
    `button[data-action="map-step"][data-dx="${direction[0]}"][data-dy="${direction[1]}"]`,
  )?.click();
  return true;
}

function investigationMap(
  profile: Profile,
  archiveCase: NonNullable<ReturnType<typeof getActiveCase>>,
  run: RunState,
): string {
  const map = createArchiveMap(archiveMapSeed(profile.id, profile.loopCount, archiveCase.id));
  const position = currentMapPosition(map, run);
  const currentRoom = map.rooms.find((room) =>
    room.position.x === position.x && room.position.y === position.y,
  )?.id ?? null;
  const positionDescription = mapPositionDescription(map, position);
  const mapStatus = [
    run.mapMessage,
    positionDescription,
    "Your route and explored rooms are saved for this case.",
  ].filter(Boolean).join(" ");
  return `<section class="archive-map" aria-labelledby="archive-map-title">
    <div class="archive-map-heading"><div><p class="eyebrow">THE ARCHIVE</p><h2 id="archive-map-title">Choose where to investigate</h2></div>
      <p>The stacks shift each night. Explore with the arrows or choose a destination; movement costs no Time. Room actions use the displayed costs.</p>
    </div>
    <div class="archive-exploration">
      <div class="rot-map-frame" role="group" tabindex="0" aria-label="Generated archive map. Use the arrow keys to explore." aria-describedby="archive-map-status">
        <div class="rot-map-host"></div>
      </div>
      <div class="archive-map-controls">
        <p class="map-legend"><span>@</span> You · ${archiveRoomDefinitions.map((room) => `<span>${room.glyph}</span> ${room.label}`).join(" · ")}</p>
        ${mapDestinations(map, run)}
        <div class="map-step-controls" role="group" aria-label="Move one step through the archive">
          <button data-action="map-step" data-dx="0" data-dy="-1" aria-label="Move north">↑</button>
          <button data-action="map-step" data-dx="-1" data-dy="0" aria-label="Move west">←</button>
          <button data-action="map-step" data-dx="0" data-dy="1" aria-label="Move south">↓</button>
          <button data-action="map-step" data-dx="1" data-dy="0" aria-label="Move east">→</button>
        </div>
      </div>
    </div>
    <p id="archive-map-status" class="map-status" role="status" aria-live="polite" aria-atomic="true">${escapeHtml(mapStatus)}</p>
    <div class="archive-rooms">
      ${evidenceRoom(archiveCase, run, currentRoom)}
      <article class="archive-room">
        <p class="room-index">02 · CATALOGUE${currentRoom === "records-desk" ? " · YOU ARE HERE" : ""}</p><h3>Records Desk</h3>
        <p class="room-description">Compare copies and look for a detail that changed.</p>
        ${roomActionList(archiveCase, run, "records-desk", currentRoom)}
        ${currentRoom === "records-desk" ? inspectionPanel(run) : ""}
      </article>
      <article class="archive-room">
        <p class="room-index">03 · RESTRICTED${currentRoom === "restricted-stacks" ? " · YOU ARE HERE" : ""}</p><h3>Restricted Stacks</h3>
        <p class="room-description">Follow the lead that may unsettle the shift.</p>
        ${roomActionList(archiveCase, run, "restricted-stacks", currentRoom)}
      </article>
      <article class="archive-room">
        <p class="room-index">04 · STAFF ONLY${currentRoom === "break-room" ? " · YOU ARE HERE" : ""}</p><h3>Break Room</h3>
        <p class="room-description">Ask ${escapeHtml(archiveCase.character)} for help and spend a Favor.</p>
        ${roomActionList(archiveCase, run, "break-room", currentRoom)}
      </article>
    </div>
  </section>`;
}

function resolutionButton(resolution: Resolution, run: RunState): string {
  const available = canResolve(run, resolution);
  const requirementLabels: Record<string, string> = {
    "bell:ink": "ink or promise clue",
    "bell:echo": "echo clue",
    "voice:script": "label or cadence clue",
    "voice:echo": "recording echo clue",
    "address:stamp": "postmark or promise clue",
    "address:inside": "letter contents clue",
    "shelf:dust": "dust map or route clue",
    "shelf:footsteps": "footsteps clue",
    "lamp:ledger": "ledger or memory clue",
    "lamp:flare": "lamp flare clue",
    "index:blank": "blank entry or choice clue",
    "index:echo": "live index clue",
  };
  const socialReward =
    resolution.socialClue && run.clues.includes(resolution.socialClue)
      ? `<small>+${resolution.composureReward ?? 0} Composure on resolve (max 4).</small>`
      : "";
  return `<button class="choice-button resolution" data-action="resolve-case" data-id="${resolution.id}" ${available ? "" : "disabled"}>
    <strong>${escapeHtml(resolution.label)}</strong>
    <span>${escapeHtml(resolution.description)}</span>
    <small>Requires ${requirementLabels[resolution.clue] ?? `${escapeHtml(resolution.clue.split(":")[1].replace(/-/g, " "))} clue`} · Cost: 1 time</small>
    ${socialReward}
  </button>`;
}

function investigationScreen(profile: Profile, run: RunState): string {
  const archiveCase = getActiveCase(run);
  if (!archiveCase) return hubScreen(profile, run);
  const dialogue = dialogueReaction(profile, run, archiveCase);
  const memoryNote = archiveMemoryNote(profile, archiveCase);
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
    : "Explore a room to find a clue.";
  return `<main class="screen">
    <div class="screen-toolbar"><button class="text-button back" data-action="back-hub">${run.entryTimePaid ? "← Leave · +1 entry Time" : "← Leave · no entry Time refund"}</button>${readingControl()}</div>
    ${unfiledClueNotice(profile, run, archiveCase.id)}
    ${shiftOrderPanel(run)}
    ${resourceBar(run)}
    <section class="case-detail">
      <p class="eyebrow case-progress">${caseProgressLabel(archiveCase)}</p>
      <p class="eyebrow">INVESTIGATION · ${archiveCase.character.toUpperCase()}</p>
      <h1>${archiveCase.title}</h1>
      ${approach}
      <div class="character-note character-context">
        <strong>${archiveCase.character} · ${archiveCase.role}</strong>
      </div>
      ${memoryNote ? `<aside class="ledger-note"><strong>${escapeHtml(memoryNote.label)}:</strong> ${escapeHtml(memoryNote.line)}</aside>` : ""}
      <details class="case-summary-panel">
        <summary>Case file · objective and summary</summary>
        <p>${escapeHtml(archiveCase.summary)}</p>
        <p><strong>Objective:</strong> find a clue, then choose an ending that fits what you know.</p>
      </details>
      ${renderDialoguePanel(dialogue, profile.id)}
      ${clues ? `<div class="clue-list" aria-label="Discovered clues">${clues}</div>` : ""}
    </section>
    <p class="helper" tabindex="-1" aria-live="polite">${clueStatus}</p>
    ${investigationMap(profile, archiveCase, run)}
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
  const unfiledCount = unfiledClueCount(profile, run);
  return `<main class="screen summary-screen">
    <div class="summary-toolbar"><p class="eyebrow">SHIFT ${profile.loopCount} · SUMMARY</p>${readingControl()}</div>
    <h1 tabindex="-1">${complete ? campaignEnding.title : "Morning has arrived."}</h1>
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
    <section class="persistence-breakdown" aria-label="What persists and what resets next shift">
      <div class="persistence-item persists"><strong>Persists</strong><span>Filed cases, facts, and NPC memories.</span></div>
      <div class="persistence-item resets"><strong>Resets next shift</strong><span>Time, Composure, Favors, and unresolved case progress${unfiledCount ? `, including ${unfiledCount} unfiled clue${unfiledCount === 1 ? "" : "s"}` : ""}.</span></div>
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
  if (run.scene === "investigation") {
    const archiveCase = getActiveCase(run);
    if (archiveCase) renderArchiveCanvas(profile, run, archiveCase);
  }
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

function closeCase(profile: Profile, run: RunState, resolution: Resolution): boolean {
  const archiveCase = getActiveCase(run);
  const activeResolution = archiveCase?.resolutions.find((item) => item.id === resolution.id);
  if (
    !archiveCase ||
    !activeResolution ||
    profile.completedCases.includes(archiveCase.id) ||
    run.resolvedCases.includes(archiveCase.id) ||
    !canResolve(run, activeResolution)
  ) return false;
  payCost(run, { time: 1 });
  let restoredComposure = 0;
  if (activeResolution.socialClue && run.clues.includes(activeResolution.socialClue)) {
    restoredComposure = Math.min(
      activeResolution.composureReward ?? 0,
      4 - run.composure,
    );
    run.composure += restoredComposure;
  }
  run.resolvedCases.push(archiveCase.id);
  if (!profile.completedCases.includes(archiveCase.id)) {
    profile.completedCases.push(archiveCase.id);
  }
  run.outcome = activeResolution.outcome;
  run.history.push(`Resolved ${archiveCase.title}: ${activeResolution.label}.`);
  if (restoredComposure > 0) {
    run.history.push(`Shared trust restored ${restoredComposure} Composure.`);
  }
  if (!profile.facts.includes(activeResolution.fact)) profile.facts.push(activeResolution.fact);
  if (!profile.currentFacts.includes(activeResolution.fact)) profile.currentFacts.push(activeResolution.fact);
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
  run.scene = "hub";
  const failure = checkFailure(run);
  if (failure) finishShift(run, failure);
  return true;
}

app.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof Element)) return;
  const button = target.closest<HTMLButtonElement>("button[data-action]");
  if (!button || button.disabled) return;
  const action = button.dataset.action;
  const id = Number(button.dataset.id);
  const profile = selectedProfile();

  if (
    saveRecovery &&
    action !== "download-save" &&
    action !== "fresh-after-recovery"
  ) return;
  if (handleDialogueAction(action, button.dataset.id, render)) return;
  if (action === "download-save") {
    if (!saveRecovery) return;
    try {
      const file = new Blob([saveRecovery.raw], { type: "application/json" });
      const url = URL.createObjectURL(file);
      const download = document.createElement("a");
      download.href = url;
      download.download = "night-shift-archive-save-recovery.json";
      download.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      recoveryActionError = null;
    } catch (error) {
      console.error("Could not prepare the save recovery download.", error);
      recoveryActionError = "The download could not be prepared. The original save remains untouched.";
      render();
    }
    return;
  }
  if (action === "fresh-after-recovery") {
    if (!saveRecovery) return;
    if (!window.confirm("Start with empty profiles? The unreadable save will first be copied to a recovery backup in this browser.")) return;
    if (!startFreshPreservingRecovery(saveRecovery)) {
      recoveryActionError = "Could not safely create a backup and start fresh. The original save remains untouched.";
      render();
      return;
    }
    profiles = [1, 2, 3].map(emptyProfile);
    saveRecovery = null;
    recoveryActionError = null;
    persistenceError = false;
    render();
    return;
  }
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
    if (!selected.run) {
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

  if (action === "shift-order") {
    if (run.scene !== "hub" || run.briefingComplete) return;
    const order = shiftOrders.find((item) => item.id === button.dataset.id);
    if (!order) return;
    run.shiftOrder = order.id;
    run.briefingComplete = true;
    if (order.id === "open-table") {
      run.favors = Math.min(2, run.favors + 1);
      run.shiftOrderUsed = true;
      run.history.push("The Night Council opened the favor ledger: +1 Favor.");
    } else {
      run.shiftOrderUsed = false;
      run.history.push(`Night Council order: ${order.label}.`);
    }
    persist();
    render();
  } else if (action === "next-shift") {
    if (run.scene !== "summary" || campaignComplete(profile)) return;
    startShift(profile, false);
  } else if (action === "replay-campaign") {
    if (run.scene !== "summary" || !campaignComplete(profile)) return;
    profile.chapter = 1;
    profile.completedCases = [];
    profile.currentFacts = [];
    startShift(profile, false);
  } else if (action === "open-case") {
    const archiveCase = archiveCases.find((item) => item.id === button.dataset.id);
    const freeEntry = run.shiftOrder === "fast-index" && !run.shiftOrderUsed;
    const entryCost = freeEntry ? 0 : 1;
    if (
      run.scene !== "hub" ||
      !run.briefingComplete ||
      !archiveCase ||
      archiveCase.chapter !== profile.chapter ||
      profile.completedCases.includes(archiveCase.id) ||
      run.resolvedCases.includes(archiveCase.id) ||
      run.time < entryCost + 1
    ) return;
    payCost(run, { time: entryCost });
    if (freeEntry) {
      run.shiftOrderUsed = true;
      run.history.push("Fast-track order waived the first case's entry Time.");
    }
    run.history.push(`Entered ${archiveCase.title}.`);
    run.activeCaseId = archiveCase.id;
    run.approach = null;
    run.inspectionActionId = null;
    run.inspectionFeedback = null;
    run.presentedClue = null;
    run.mapPosition = null;
    run.mapExplored = [];
    run.mapMessage = null;
    run.interviewedTopics = [];
    run.selectedInterviewId = null;
    run.entryTimePaid = !freeEntry;
    run.scene = "planning";
    const failure = checkFailure(run);
    if (failure) finishShift(run, failure);
    persist();
    render();
  } else if (action === "approach") {
    const archiveCase = getActiveCase(run);
    const approach = archiveCase?.approaches.find((item) => item.label === button.dataset.value);
    if (run.scene !== "planning" || !approach) return;
    run.approach = approach.label;
    persist();
    render();
  } else if (action === "begin-investigation") {
    const archiveCase = getActiveCase(run);
    if (
      run.scene !== "planning" ||
      !run.approach ||
      !archiveCase?.approaches.some((item) => item.label === run.approach)
    ) return;
    run.history.push(`Planned lead: ${run.approach}.`);
    run.scene = "investigation";
    const map = createArchiveMap(archiveMapSeed(profile.id, profile.loopCount, archiveCase.id));
    rememberMapPosition(run, map, map.start);
    run.mapMessage = `The ${map.rooms[0].label} is your starting point. Movement does not spend Time.`;
    persist();
    render();
  } else if (action === "map-step") {
    const archiveCase = getActiveCase(run);
    const deltaX = Number(button.dataset.dx);
    const deltaY = Number(button.dataset.dy);
    if (
      run.scene !== "investigation" ||
      !archiveCase ||
      !Number.isInteger(deltaX) ||
      !Number.isInteger(deltaY) ||
      Math.abs(deltaX) + Math.abs(deltaY) !== 1
    ) return;
    const map = createArchiveMap(archiveMapSeed(profile.id, profile.loopCount, archiveCase.id));
    const current = currentMapPosition(map, run);
    const destination = { x: current.x + deltaX, y: current.y + deltaY };
    if (!isMapWalkable(map, destination)) {
      const direction = deltaY < 0
        ? "north"
        : deltaY > 0
          ? "south"
          : deltaX < 0
            ? "west"
            : "east";
      run.mapMessage = `A wall blocks the path ${direction}. Movement does not spend Time.`;
      persist();
      render();
      appRoot.querySelector<HTMLDivElement>(".rot-map-frame")?.focus();
      return;
    }
    rememberMapPosition(run, map, destination);
    run.mapMessage = "You move through the stacks. Movement does not spend Time.";
    persist();
    render();
    appRoot.querySelector<HTMLDivElement>(".rot-map-frame")?.focus();
  } else if (action === "navigate-room") {
    const archiveCase = getActiveCase(run);
    if (run.scene !== "investigation" || !archiveCase) return;
    const map = createArchiveMap(archiveMapSeed(profile.id, profile.loopCount, archiveCase.id));
    const room = map.rooms.find((item) => item.id === button.dataset.id);
    if (!room) return;
    const route = findArchivePath(map, currentMapPosition(map, run), room.position);
    if (!route.length) return;
    rememberMapPosition(run, map, room.position, route);
    run.mapMessage = `You follow a ${route.length - 1}-step route to the ${room.label}. Movement does not spend Time.`;
    persist();
    render();
    appRoot.querySelector<HTMLDivElement>(".rot-map-frame")?.focus();
  } else if (action === "investigate") {
    const archiveCase = getActiveCase(run);
    const selectedAction = archiveCase?.actions.find((item) => item.id === button.dataset.id);
    if (!selectedAction || selectedAction.inspection || !applyAction(profile, run, selectedAction)) return;
    run.history.push(`Pursued: ${selectedAction.label}.`);
    const failure = checkFailure(run);
    if (failure) finishShift(run, failure);
    persist();
    render();
  } else if (action === "inspect-record") {
    const archiveCase = getActiveCase(run);
    const selectedAction = archiveCase?.actions.find((item) => item.id === button.dataset.id);
    if (
      !selectedAction?.inspection ||
      !canApplyAction(run, selectedAction)
    ) return;
    run.inspectionActionId = selectedAction.id;
    run.inspectionFeedback = null;
    run.presentedClue = null;
    persist();
    render();
    appRoot.querySelector<HTMLElement>("#inspection-title")?.focus();
  } else if (action === "inspect-answer") {
    const archiveCase = getActiveCase(run);
    const selectedAction = archiveCase?.actions.find((item) => item.id === run.inspectionActionId);
    const answer = Number(button.dataset.id);
    if (
      !selectedAction?.inspection ||
      !Number.isInteger(answer) ||
      answer < 0 ||
      answer >= selectedAction.inspection.options.length
    ) return;
    if (answer !== selectedAction.inspection.answer) {
      run.inspectionFeedback = "That detail does not match the change between these copies. Compare them again.";
      persist();
      render();
      appRoot.querySelector<HTMLElement>(".inspection-feedback")?.focus();
      return;
    }
    if (!applyAction(profile, run, selectedAction)) return;
    run.history.push(`Compared the records: ${selectedAction.label}.`);
    const failure = checkFailure(run);
    if (failure) finishShift(run, failure);
    persist();
    render();
    appRoot.querySelector<HTMLElement>(
      run.scene === "summary" ? ".summary-screen h1" : ".helper",
    )?.focus();
  } else if (action === "cancel-inspection") {
    if (run.scene !== "investigation") return;
    run.inspectionActionId = null;
    run.inspectionFeedback = null;
    persist();
    render();
    appRoot.querySelector<HTMLButtonElement>('[data-action="inspect-record"]')?.focus();
  } else if (action === "ask-topic") {
    const archiveCase = getActiveCase(run);
    const topic = archiveCase?.interviewTopics.find((item) => item.id === button.dataset.id);
    if (
      run.scene !== "investigation" ||
      !archiveCase ||
      !topic
    ) return;
    if (!run.interviewedTopics.includes(topic.id)) {
      run.interviewedTopics.push(topic.id);
    }
    run.selectedInterviewId = topic.id;
    run.presentedClue = null;
    persist();
    render();
    [...appRoot.querySelectorAll<HTMLButtonElement>('[data-action="ask-topic"]')]
      .find((topicButton) => topicButton.dataset.id === topic.id)
      ?.focus();
  } else if (action === "present-evidence") {
    const archiveCase = getActiveCase(run);
    const clue = button.dataset.id;
    if (
      run.scene !== "investigation" ||
      !archiveCase ||
      !clue ||
      !run.clues.includes(clue) ||
      !clue.startsWith(`${archiveCase.id}:`)
    ) return;
    run.presentedClue = clue;
    run.selectedInterviewId = null;
    persist();
    render();
    [...appRoot.querySelectorAll<HTMLButtonElement>('[data-action="present-evidence"]')]
      .find((evidenceButton) => evidenceButton.dataset.id === clue)
      ?.focus();
  } else if (action === "resolve-case") {
    const archiveCase = getActiveCase(run);
    const resolution = archiveCase?.resolutions.find((item) => item.id === button.dataset.id);
    if (!resolution || !canResolve(run, resolution)) return;
    if (!closeCase(profile, run, resolution)) return;
    persist();
    render();
  } else if (action === "back-hub") {
    if (run.scene !== "planning" && run.scene !== "investigation") return;
    const archiveCase = getActiveCase(run);
    if (archiveCase) {
      const unfiledCount = unfiledClueCount(profile, run, archiveCase.id);
      if (
        unfiledCount > 0 &&
        !window.confirm(
          `Leave ${archiveCase.title}? Its ${unfiledCount} unfiled clue${unfiledCount === 1 ? "" : "s"} will remain available if you return this shift, but reset if the case is not filed tonight.`,
        )
      ) return;
      if (run.entryTimePaid) {
        run.time = Math.min(5, run.time + 1);
        run.history.push(`Left ${archiveCase.title}; entry Time refunded.`);
      } else {
        run.history.push(`Left ${archiveCase.title}; no entry Time was paid.`);
      }
    }
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
    run.scene = "hub";
    persist();
    render();
    appRoot.querySelector<HTMLElement>(".unfiled-clue-warning")?.focus();
  } else if (action === "end-shift") {
    if (run.scene !== "hub") return;
    const unfiledCount = unfiledClueCount(profile, run);
    if (
      unfiledCount > 0 &&
      !window.confirm(
        `Ending now will reset ${unfiledCount} unfiled clue${unfiledCount === 1 ? "" : "s"} from unresolved cases. End the shift?`,
      )
    ) return;
    run.history.push("Closed the shift early.");
    finishShift(run, "You choose to close the ledger early and leave the unanswered stories for another night.");
    persist();
    render();
    appRoot.querySelector<HTMLElement>(".summary-screen h1")?.focus();
  }
});

appRoot.addEventListener("change", (event) => {
  handleDialogueChange(event.target, render);
});

document.addEventListener("keydown", (event) => {
  if (handleArchiveMapKeydown(event)) return;
  handleDialogueKeydown(
    event,
    selectedProfile()?.run?.scene === "investigation",
    render,
  );
});

render();
