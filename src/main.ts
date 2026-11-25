// @ts-ignore CSS is loaded by the bundler; TypeScript has no CSS module declaration.
import "./styles.css";
import { archiveCases } from "./content/cases";
import type { CaseAction, Cost, Profile, Resolution, RunState } from "./game/types";
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

let profiles = loadProfiles();
let activeProfileId: number | null = null;
let largeText = loadLargeTextPreference();

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
  saveProfiles(profiles);
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
  if (cost.time !== undefined) parts.push(`${cost.time} time`);
  if (cost.composure) parts.push(`${cost.composure} composure`);
  if (cost.favors) parts.push(`${cost.favors} favor`);
  const costText = parts.length ? `Cost: ${parts.join(", ")}` : "No resource cost";
  const effects: string[] = [];
  if (options.matchingLead) effects.push("matching plan waives 1 time");
  if (options.timeRefund) effects.push(`success returns ${options.timeRefund} time`);
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
    const runLabel =
      profile.run?.scene === "summary"
        ? "Shift complete — start next"
        : profile.run
          ? "Continue current shift"
          : occupied
            ? "Begin next shift"
            : "Start a new profile";
    return `<article class="profile-card ${occupied ? "" : "empty"}">
      <div>
        <p class="eyebrow">PROFILE ${profile.id}</p>
        <h2>${occupied ? `Shift ${profile.loopCount}` : "An empty file"}</h2>
        <p>${occupied ? `${profile.facts.length} lasting ${profile.facts.length === 1 ? "fact" : "facts"} · ${profile.adaMemory + profile.ivoMemory} remembered moments` : "A separate archive history and set of memories."}</p>
      </div>
      <button class="button primary" data-action="select-profile" data-id="${profile.id}">${runLabel}</button>
      ${occupied ? `<button class="text-button danger" data-action="reset-profile" data-id="${profile.id}">Reset this profile</button>` : ""}
    </article>`;
  }).join("");

  return `<main class="screen title-screen">
    <header class="masthead">
      <div class="masthead-utility"><p class="eyebrow">A narrative roguelike prototype</p>${readingControl()}</div>
      <h1>The Night-Shift <em>Archive</em></h1>
      <p class="intro">Unfinished stories gather here after dark. You have until morning to decide what deserves an ending.</p>
    </header>
    <section class="profile-list" aria-label="Save profiles">${slots}</section>
    <p class="footnote">Your discoveries and the people you meet can remember a shift. Time and composure cannot.</p>
    <p class="footnote">Progress is saved in this browser on this site; it does not sync between players or devices.</p>
    <p class="footnote">Your reading-size preference is also saved in this browser.</p>
  </main>`;
}

function hubScreen(profile: Profile, run: RunState): string {
  const caseCards = archiveCases.map((archiveCase) => {
    const resolved = run.resolvedCases.includes(archiveCase.id);
    const canEnter = run.time >= 2;
    return `<article class="case-card ${resolved ? "resolved" : ""}">
      <div class="case-number">${resolved ? "FILED" : "CASE"}</div>
      <h3>${archiveCase.title}</h3>
      <p>${archiveCase.summary}</p>
      <p class="person"><strong>${archiveCase.character}</strong> · ${archiveCase.role}</p>
      <button class="button ${resolved ? "quiet" : "primary"}" data-action="open-case" data-id="${archiveCase.id}" ${resolved || !canEnter ? "disabled" : ""}>
        ${resolved ? "Case resolved" : canEnter ? "Plan this case · 1 time" : "Need 2 time to resolve"}
      </button>
    </article>`;
  }).join("");
  return `<main class="screen">
    <header class="topline">
      <div><p class="eyebrow">PROFILE ${profile.id} · SHIFT ${profile.loopCount}</p><h1>The archive floor</h1></div>
      <div class="topline-actions">${readingControl()}<button class="text-button" data-action="profiles">Change profile</button></div>
    </header>
    ${resourceBar(run)}
    <section class="narrative-panel">
      <p class="eyebrow">12:07 AM · NORTH READING ROOM</p>
      <p>The desk lamp hums above two folders. The clock has no hands, but the archive knows when morning comes.</p>
      ${profile.facts.length ? `<p class="memory-note"><strong>What you carry:</strong> ${profile.facts.map(escapeHtml).join(" · ")}</p>` : ""}
    </section>
    ${run.outcome ? `<section class="narrative-panel outcome" aria-live="polite"><p class="eyebrow">CASE OUTCOME</p><p>${escapeHtml(run.outcome)}</p></section>` : ""}
    <details class="guide-panel optional-guide">
      <summary>How a shift works <span>(optional)</span></summary>
      <p>Entering a case costs 1 time. The approach matching your planned lead waives 1 time on its investigation action. Social clues cost a Favor and restore 1 Composure when resolved; risky clues cost 2 Composure and return 1 Time. A matching clue enables a resolution, which costs 1 time. Every cost and effect appears before you commit.</p>
      <p>Time or Composure reaching zero ends the shift. Run resources reset on the next shift; profile facts and NPC familiarity remain.</p>
    </details>
    <section class="case-grid" aria-label="Available cases">${caseCards}</section>
    ${run.time < 2 && run.resolvedCases.length < archiveCases.length ? `<p class="helper">There is not enough time to enter and resolve another case. End the shift or restart after the summary.</p>` : ""}
    <div class="actions-row"><button class="button secondary" data-action="end-shift">End shift early</button></div>
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
      ? `<small>${leadAction.memory === "ada" ? "Ada" : "Ivo"} remembers this choice across shifts.</small>`
      : "";
    const socialEffect = socialReward
      ? `<small>The matching resolution restores ${socialReward} Composure (up to 4).</small>`
      : "";
    return `<button class="choice-button ${run.approach === approach.label ? "chosen" : ""}" data-action="approach" data-value="${escapeHtml(approach.label)}">
      <strong>${escapeHtml(approach.label)}</strong>
      <span>Lead: ${escapeHtml(leadAction.label)}${previewResolution ? ` → ${escapeHtml(previewResolution.label)}` : ""}</span>
      <small>${costLabel(leadCost, { matchingLead: true, timeRefund: leadAction.timeRefund })}</small>
      ${memoryEffect}${socialEffect}
    </button>`;
  }).join("");
  return `<main class="screen">
    <div class="screen-toolbar"><button class="text-button back" data-action="back-hub">← Back to the archive</button>${readingControl()}</div>
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
    <section class="guide-panel"><p class="eyebrow">PLANNING</p><p>Entering this case cost 1 time. Your chosen lead previews its clue and resolution; the matching investigation action waives 1 time.</p></section>
    <section class="choice-section"><h2>Choose your approach</h2><div class="choice-list">${approaches}</div></section>
    <button class="button primary wide" data-action="begin-investigation" ${run.approach ? "" : "disabled"}>Begin investigation · no cost</button>
  </main>`;
}

function dialogueReaction(
  profile: Profile,
  run: RunState,
  archiveCase: NonNullable<ReturnType<typeof getActiveCase>>,
): { trigger: string; line: string } {
  const socialAction = archiveCase.actions.find((action) => action.memory);
  if (socialAction && run.clues.includes(socialAction.clue)) {
    return { trigger: "After you spent a Favor", line: archiveCase.dialogue.afterFavor };
  }

  const hasRiskyClue = archiveCase.actions.some(
    (action) => action.cost.composure && run.clues.includes(action.clue),
  );
  const hasNonRiskyClue = archiveCase.actions.some(
    (action) => !action.cost.composure && !action.memory && run.clues.includes(action.clue),
  );
  if (hasRiskyClue) {
    return { trigger: "After a risky clue", line: archiveCase.dialogue.afterRiskyClue };
  }
  if (hasNonRiskyClue) {
    return { trigger: "After a clue", line: archiveCase.dialogue.afterNonRiskyClue };
  }

  const familiarity = archiveCase.id === "bell" ? profile.adaMemory : profile.ivoMemory;
  if (profile.loopCount >= 2 && familiarity > 0) {
    return { trigger: "Déjà vu", line: archiveCase.dialogue.dejaVu };
  }
  return { trigger: "First meeting", line: archiveCase.dialogue.firstMeeting };
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
  const memoryEffect = action.memory
    ? `<small>${action.memory === "ada" ? "Ada" : "Ivo"} will remember your help across shifts.</small>`
    : "";
  return `<button class="choice-button" data-action="investigate" data-id="${action.id}" ${known || !affordable ? "disabled" : ""}>
    <strong>${escapeHtml(action.label)} ${known ? "· clue found" : ""}</strong>
    <span>${escapeHtml(action.description)}</span>
    <small>${costLabel(cost, { matchingLead, timeRefund: action.timeRefund })}</small>
    ${memoryEffect}
    ${timeWarning}
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
      ? `<small>Social benefit: +${resolution.composureReward ?? 0} Composure (up to 4).</small>`
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
    ? "Clue found. A matching resolution is available below."
    : "No clue found yet. Your planned lead costs no Time; other actions show their costs and effects.";
  return `<main class="screen">
    <div class="screen-toolbar"><button class="text-button back" data-action="back-hub">← Leave case</button>${readingControl()}</div>
    ${resourceBar(run)}
    <section class="case-detail">
      <p class="eyebrow">INVESTIGATION · ${archiveCase.character.toUpperCase()}</p>
      <h1>${archiveCase.title}</h1>
      ${approach}
      <div class="character-note">
        <strong>${archiveCase.character} · ${archiveCase.role}</strong>
        <p class="dialogue-trigger">${dialogue.trigger}</p>
        <p class="dialogue-line" aria-live="polite">“${escapeHtml(dialogue.line)}”</p>
        <p class="character-context"><strong>Need:</strong> ${escapeHtml(archiveCase.need)} <strong>Concern:</strong> ${escapeHtml(archiveCase.concern)}</p>
      </div>
      ${clues ? `<div class="clue-list" aria-label="Discovered clues">${clues}</div>` : `<p class="helper">No clues discovered yet.</p>`}
    </section>
    <p class="helper" aria-live="polite">${clueStatus}</p>
    <section class="choice-section"><h2>Investigate or talk</h2><div class="choice-list">${actions}</div></section>
    <section class="choice-section"><h2>Resolve the case</h2><p class="helper">A resolution costs one time and needs the clue shown on its option.</p><div class="choice-list">${resolutions}</div></section>
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
  return `<main class="screen summary-screen">
    <div class="summary-toolbar"><p class="eyebrow">SHIFT ${profile.loopCount} · SUMMARY</p>${readingControl()}</div>
    <h1>Morning has arrived.</h1>
    <p class="intro">${escapeHtml(run.endReason ?? "You leave the archive as the night gives way.")}</p>
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
      <h2>What carries forward</h2>
      ${facts ? `<ul>${facts}</ul>` : "<p>No lasting facts discovered yet.</p>"}
      <p>Ada remembers ${profile.adaMemory} moment${profile.adaMemory === 1 ? "" : "s"}; Ivo remembers ${profile.ivoMemory} moment${profile.ivoMemory === 1 ? "" : "s"}.</p>
    </section>
    <button class="button primary wide" data-action="next-shift">${failed ? "Restart shift" : "Begin the next shift"}</button>
    <button class="text-button centered" data-action="profiles">Return to profiles</button>
  </main>`;
}

function render(): void {
  document.documentElement.classList.toggle("large-text", largeText);
  const profile = selectedProfile();
  if (!profile || !profile.run) {
    appRoot.innerHTML = profileScreen();
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
}

function startShift(profile: Profile, isFirstShift: boolean): void {
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
  run.outcome = resolution.outcome;
  run.history.push(`Resolved ${archiveCase.title}: ${resolution.label}.`);
  if (restoredComposure > 0) {
    run.history.push(`Shared trust restored ${restoredComposure} Composure.`);
  }
  if (!profile.facts.includes(resolution.fact)) profile.facts.push(resolution.fact);
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
    if (!selected.run || selected.run.scene === "summary") {
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
  } else if (action === "open-case") {
    const archiveCase = archiveCases.find((item) => item.id === button.dataset.id);
    if (!archiveCase || run.resolvedCases.includes(archiveCase.id) || run.time < 2) return;
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

render();
