export interface DialogueBeat {
  key: string;
  speaker: string;
  trigger: string;
  line: string;
  expression: string;
}

type DialogueSpeed = "slow" | "normal" | "fast" | "instant";

interface DialogueSettings {
  speed: DialogueSpeed;
  sfx: boolean;
  auto: boolean;
}

interface DialogueCharacter {
  value: string;
  styles: string[];
  color?: string;
  speed?: number;
}

interface DialoguePause {
  pause: number;
}

type DialogueToken = DialogueCharacter | DialoguePause;

interface Playback {
  beat: DialogueBeat;
  tokens: DialogueToken[];
  characterCount: number;
  cursor: number;
  visibleCharacters: number;
  soundCharacters: number;
  typing: boolean;
  timer: number | null;
  autoTimer: number | null;
  finishedAt: number;
}

const SETTINGS_KEY = "night-shift-archive.dialogue.v1";
const SPEEDS: Record<DialogueSpeed, number> = {
  slow: 40,
  normal: 24,
  fast: 10,
  instant: 0,
};
const DEFAULT_SETTINGS: DialogueSettings = { speed: "normal", sfx: false, auto: false };
const MAX_HISTORY = 200;

let settings = loadSettings();
let activeProfileId: number | null = null;
let history: DialogueBeat[] = [];
let currentBeatKey: string | null = null;
let historyIndex = -1;
let playback: Playback | null = null;
let audioContext: AudioContext | null = null;
let audioWarningShown = false;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function loadSettings(): DialogueSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return { ...DEFAULT_SETTINGS };
    return {
      speed: parsed.speed === "slow" || parsed.speed === "normal" ||
          parsed.speed === "fast" || parsed.speed === "instant"
        ? parsed.speed
        : DEFAULT_SETTINGS.speed,
      sfx: typeof parsed.sfx === "boolean" ? parsed.sfx : DEFAULT_SETTINGS.sfx,
      auto: typeof parsed.auto === "boolean" ? parsed.auto : DEFAULT_SETTINGS.auto,
    };
  } catch (error) {
    console.warn("Could not read dialogue preferences; using defaults.", error);
    return { ...DEFAULT_SETTINGS };
  }
}

function saveSettings(): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.warn("Could not save dialogue preferences.", error);
  }
}

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function effectiveSpeed(): number {
  return prefersReducedMotion() ? 0 : SPEEDS[settings.speed];
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

function removeStyle(styles: string[], style: string): void {
  const index = styles.lastIndexOf(style);
  if (index >= 0) styles.splice(index, 1);
}

function parseDialogue(line: string): DialogueToken[] {
  const tokens: DialogueToken[] = [];
  const styles: string[] = [];
  const colors: string[] = [];
  const speeds: Array<number | undefined> = [undefined];
  const marker = /(\{pause:\d{1,4}\}|\{speed:\d{1,3}\}|\{\/speed\}|\{color:#[\da-fA-F]{6}\}|\{\/color\}|\{shake\}|\{\/shake\}|\{wave\}|\{\/wave\}|\*\*|\*)/g;
  let cursor = 0;
  let match: RegExpExecArray | null;

  const addText = (text: string): void => {
    for (const value of text) {
      tokens.push({
        value,
        styles: [...styles],
        color: colors[colors.length - 1],
        speed: speeds[speeds.length - 1],
      });
    }
  };

  while ((match = marker.exec(line)) !== null) {
    addText(line.slice(cursor, match.index));
    const token = match[0];
    if (token.startsWith("{pause:")) {
      tokens.push({ pause: Math.min(2000, Number(token.slice(7, -1))) });
    } else if (token.startsWith("{speed:")) {
      speeds.push(Math.min(200, Number(token.slice(7, -1))));
    } else if (token === "{/speed}") {
      if (speeds.length > 1) speeds.pop();
    } else if (token.startsWith("{color:")) {
      colors.push(token.slice(7, -1));
    } else if (token === "{/color}") {
      colors.pop();
    } else if (token === "{shake}" || token === "{wave}") {
      styles.push(token.slice(1, -1));
    } else if (token === "{/shake}") {
      removeStyle(styles, "shake");
    } else if (token === "{/wave}") {
      removeStyle(styles, "wave");
    } else if (token === "**") {
      if (styles.includes("bold")) removeStyle(styles, "bold");
      else styles.push("bold");
    } else if (token === "*") {
      if (styles.includes("italic")) removeStyle(styles, "italic");
      else styles.push("italic");
    }
    cursor = match.index + token.length;
  }
  addText(line.slice(cursor));
  return tokens;
}

function plainText(tokens: DialogueToken[]): string {
  return tokens.map((token) => "value" in token ? token.value : "").join("");
}

function renderCharacters(tokens: DialogueToken[], count: number): string {
  let rendered = "";
  let visible = 0;
  for (const token of tokens) {
    if (!("value" in token)) continue;
    if (visible >= count) break;
    const value = escapeHtml(token.value);
    const classes = token.styles.map((style) => `dialogue-${style}`);
    const styleAttribute = token.color ? ` style="--dialogue-color:${token.color}"` : "";
    rendered += classes.length || token.color
      ? `<span${classes.length ? ` class="${classes.join(" ")}"` : ""}${styleAttribute}>${value}</span>`
      : value;
    visible += 1;
  }
  return rendered;
}

function resetProfile(profileId: number): void {
  clearPlaybackTimers();
  activeProfileId = profileId;
  history = [];
  historyIndex = -1;
  currentBeatKey = null;
  playback = null;
}

function clearPlaybackTimers(): void {
  if (playback?.timer !== null && playback?.timer !== undefined) window.clearTimeout(playback.timer);
  if (playback?.autoTimer !== null && playback?.autoTimer !== undefined) window.clearTimeout(playback.autoTimer);
}

function createPlayback(beat: DialogueBeat, alreadySeen: boolean): Playback {
  const tokens = parseDialogue(beat.line);
  const count = tokens.filter((token) => "value" in token).length;
  const instant = effectiveSpeed() === 0 || alreadySeen;
  return {
    beat,
    tokens,
    characterCount: count,
    cursor: instant ? tokens.length : 0,
    visibleCharacters: instant ? count : 0,
    soundCharacters: 0,
    typing: !instant,
    timer: null,
    autoTimer: null,
    finishedAt: instant ? Date.now() : 0,
  };
}

function rememberBeat(beat: DialogueBeat, profileId: number): DialogueBeat {
  if (activeProfileId !== profileId) resetProfile(profileId);
  if (beat.key !== currentBeatKey) {
    const existingIndex = history.findIndex((entry) => entry.key === beat.key);
    currentBeatKey = beat.key;
    clearPlaybackTimers();
    if (existingIndex >= 0) {
      historyIndex = existingIndex;
      playback = createPlayback(beat, true);
    } else {
      history.push(beat);
      if (history.length > MAX_HISTORY) history.shift();
      historyIndex = -1;
      playback = createPlayback(beat, false);
    }
  }
  return historyIndex >= 0 ? history[historyIndex] : beat;
}

function ensureAudio(): void {
  if (!settings.sfx || audioContext) return;
  if (!window.AudioContext) {
    if (!audioWarningShown) console.warn("This browser does not support dialogue sound effects.");
    audioWarningShown = true;
    return;
  }
  try {
    audioContext = new window.AudioContext();
    if (audioContext.state === "suspended") {
      void audioContext.resume().catch((error: unknown) => {
        console.warn("Could not resume dialogue audio.", error);
      });
    }
  } catch (error) {
    console.warn("Could not initialize dialogue audio.", error);
  }
}

function playBlip(character: string): void {
  if (!settings.sfx || !audioContext || /[\s.,!?;:—–'"“”‘’…()[\]{}]/u.test(character)) return;
  if (!/[a-z0-9]/iu.test(character)) return;
  if (!playback) return;
  playback.soundCharacters += 1;
  if (playback.soundCharacters % 3 !== 0) return;

  try {
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const now = audioContext.currentTime;
    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(440 + (Math.random() * 50 - 25), now);
    gain.gain.setValueAtTime(0.012, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.04);
  } catch (error) {
    console.warn("Could not play a dialogue sound effect.", error);
  }
}

function updateVisibleText(): void {
  if (!playback || historyIndex >= 0) return;
  const output = document.querySelector<HTMLElement>(".dialogue-visible");
  if (output) output.innerHTML = renderCharacters(playback.tokens, playback.visibleCharacters);
  const cue = document.querySelector<HTMLElement>(".dialogue-cue");
  if (cue) cue.hidden = playback.typing;
  const stage = document.querySelector<HTMLButtonElement>(".dialogue-stage");
  if (stage) {
    stage.setAttribute(
      "aria-label",
      `${playback.beat.speaker}: ${plainText(playback.tokens)} ${
        playback.typing ? "Activate to show the full line." : "Activate to focus the next choice."
      }`,
    );
  }
}

function renderAndFocus(rerender: () => void, selector = ".dialogue-stage"): void {
  rerender();
  document.querySelector<HTMLElement>(selector)?.focus();
}

function focusNextChoice(): void {
  document.querySelector<HTMLButtonElement>(
    'button[data-action="investigate"]:not(:disabled), button[data-action="resolve-case"]:not(:disabled)',
  )?.focus();
}

function finishTyping(allowAutoFocus = true): void {
  if (!playback) return;
  if (playback.timer !== null) window.clearTimeout(playback.timer);
  playback.timer = null;
  playback.cursor = playback.tokens.length;
  playback.visibleCharacters = playback.characterCount;
  playback.typing = false;
  playback.finishedAt = Date.now();
  updateVisibleText();
  if (allowAutoFocus && settings.auto) scheduleAutoFocus();
}

function scheduleAutoFocus(): void {
  if (!playback || playback.typing) return;
  if (playback.autoTimer !== null) window.clearTimeout(playback.autoTimer);
  const key = playback.beat.key;
  const delay = Math.max(1200, playback.characterCount * 45);
  playback.autoTimer = window.setTimeout(() => {
    if (playback?.beat.key === key && !playback.typing) focusNextChoice();
  }, delay);
}

function typeNext(): void {
  if (!playback || !playback.typing || historyIndex >= 0) return;
  if (playback.cursor >= playback.tokens.length) {
    finishTyping();
    return;
  }
  const token = playback.tokens[playback.cursor];
  playback.cursor += 1;
  if ("pause" in token) {
    playback.timer = window.setTimeout(typeNext, token.pause);
    return;
  }

  playback.visibleCharacters += 1;
  playBlip(token.value);
  updateVisibleText();
  const delay = prefersReducedMotion() ? 0 : token.speed ?? SPEEDS[settings.speed];
  playback.timer = window.setTimeout(typeNext, delay);
}

function scheduleTyping(): void {
  if (!playback || !playback.typing || playback.timer !== null) return;
  playback.timer = window.setTimeout(typeNext, 0);
}

function selectPrevious(): void {
  if (history.length < 2) return;
  historyIndex = historyIndex < 0 ? history.length - 2 : Math.max(0, historyIndex - 1);
}

function showHistoryDialog(): void {
  const dialog = document.querySelector<HTMLDialogElement>("#dialogue-log");
  if (!dialog?.open) dialog?.showModal();
}

function closeHistoryDialog(): void {
  document.querySelector<HTMLDialogElement>("#dialogue-log")?.close();
}

export function renderDialoguePanel(beat: DialogueBeat, profileId: number): string {
  const displayed = rememberBeat(beat, profileId);
  const visibleBeat = displayed.key === playback?.beat.key ? playback : null;
  const tokens = visibleBeat?.tokens ?? parseDialogue(displayed.line);
  const text = plainText(tokens);
  const visibleCount = visibleBeat?.visibleCharacters ?? tokens.filter((token) => "value" in token).length;
  const isTyping = Boolean(visibleBeat?.typing && historyIndex < 0);
  const historyItems = history.map((entry, index) =>
    `<li><button class="dialogue-log-line" data-action="dialogue-history-line" data-id="${index}">
      <strong>${escapeHtml(entry.speaker)} · ${escapeHtml(entry.trigger)}</strong>
      <span>${escapeHtml(plainText(parseDialogue(entry.line)))}</span>
    </button></li>`,
  ).join("");
  const options = (Object.keys(SPEEDS) as DialogueSpeed[]).map((speed) =>
    `<option value="${speed}" ${settings.speed === speed ? "selected" : ""}>${speed[0].toUpperCase()}${speed.slice(1)}</option>`,
  ).join("");
  const reducedMotionNote = prefersReducedMotion()
    ? `<small class="dialogue-setting-note">Reduced motion: instant text</small>`
    : "";
  const viewLabel = historyIndex >= 0
    ? `<button class="text-button dialogue-current" data-action="dialogue-current">Return to current line</button>`
    : "";
  const lineHtml = renderCharacters(tokens, visibleCount);

  return `<section class="dialogue-panel expression-${escapeHtml(displayed.expression)}" aria-label="Dialogue">
    <header class="dialogue-header">
      <div class="dialogue-speaker">
        <p class="eyebrow">${escapeHtml(displayed.trigger)}</p>
        <strong>${escapeHtml(displayed.speaker)}</strong>
      </div>
      <div class="dialogue-controls">
        <button class="dialogue-control" data-action="dialogue-sfx" aria-pressed="${settings.sfx}" aria-label="Toggle dialogue sound effects">SFX ${settings.sfx ? "On" : "Off"}</button>
        <label class="dialogue-speed-label">Text
          <select data-dialogue-speed aria-label="Dialogue text speed">${options}</select>
        </label>
        <button class="dialogue-control" data-action="dialogue-auto" aria-pressed="${settings.auto}" aria-label="Toggle automatic dialogue reading">Auto ${settings.auto ? "On" : "Off"}</button>
        <button class="dialogue-control" data-action="dialogue-log-open" aria-haspopup="dialog">Log (${history.length})</button>
      </div>
    </header>
    <button class="dialogue-stage" data-action="dialogue-advance" aria-label="${escapeHtml(displayed.speaker)}: ${escapeHtml(text)} ${isTyping ? "Activate to show the full line." : "Activate to focus the next choice."}">
      <span class="dialogue-copy" aria-hidden="true">
        <span class="dialogue-measure">${escapeHtml(text)}</span>
        <span class="dialogue-visible">${lineHtml}</span>
      </span>
      <span class="dialogue-cue" aria-hidden="true" ${isTyping ? "hidden" : ""}>✦</span>
    </button>
    <span class="visually-hidden" aria-live="polite">${escapeHtml(displayed.speaker)}: ${escapeHtml(text)}</span>
    <footer class="dialogue-footer">
      <button class="text-button" data-action="dialogue-previous" ${history.length < 2 || (historyIndex === 0) ? "disabled" : ""}>← Previous</button>
      ${viewLabel}
      <span class="dialogue-hint">${isTyping ? "Click or press Space to finish" : "Click to focus a choice"}</span>
    </footer>
    ${reducedMotionNote}
  </section>
  <dialog id="dialogue-log" class="dialogue-log" aria-labelledby="dialogue-log-title">
    <header class="dialogue-log-header">
      <div><p class="eyebrow">TRANSCRIPT</p><h2 id="dialogue-log-title">Dialogue log</h2></div>
      <form method="dialog"><button class="dialogue-control" aria-label="Close dialogue log">Close</button></form>
    </header>
    ${historyItems ? `<ol class="dialogue-log-list">${historyItems}</ol>` : "<p>No dialogue read yet.</p>"}
  </dialog>`;
}

export function afterDialogueRender(isInvestigation: boolean): void {
  if (isInvestigation) {
    scheduleTyping();
  } else if (playback) {
    if (playback.autoTimer !== null) window.clearTimeout(playback.autoTimer);
    playback.autoTimer = null;
    if (playback.typing) finishTyping(false);
  }
}

export function handleDialogueAction(
  action: string | undefined,
  id: string | undefined,
  rerender: () => void,
): boolean {
  switch (action) {
    case "dialogue-advance":
      if (historyIndex >= 0) {
        historyIndex = -1;
        rerender();
      } else if (playback?.typing) {
        finishTyping();
      } else if (playback && Date.now() - playback.finishedAt >= 150) {
        focusNextChoice();
      }
      return true;
    case "dialogue-previous":
      selectPrevious();
      renderAndFocus(rerender);
      return true;
    case "dialogue-current":
      historyIndex = -1;
      renderAndFocus(rerender);
      return true;
    case "dialogue-history-line": {
      const selectedIndex = Number(id);
      if (Number.isInteger(selectedIndex) && selectedIndex >= 0 && selectedIndex < history.length) {
        historyIndex = selectedIndex === history.length - 1 ? -1 : selectedIndex;
        closeHistoryDialog();
        renderAndFocus(rerender);
      }
      return true;
    }
    case "dialogue-log-open":
      showHistoryDialog();
      return true;
    case "dialogue-sfx":
      settings.sfx = !settings.sfx;
      if (settings.sfx) ensureAudio();
      saveSettings();
      renderAndFocus(rerender, '[data-action="dialogue-sfx"]');
      return true;
    case "dialogue-auto":
      settings.auto = !settings.auto;
      saveSettings();
      if (settings.auto) scheduleAutoFocus();
      else if (playback?.autoTimer !== null && playback?.autoTimer !== undefined) {
        window.clearTimeout(playback.autoTimer);
        playback.autoTimer = null;
      }
      renderAndFocus(rerender, '[data-action="dialogue-auto"]');
      return true;
    default:
      return false;
  }
}

export function handleDialogueChange(target: EventTarget | null, rerender: () => void): void {
  if (!(target instanceof HTMLSelectElement) || !target.matches("[data-dialogue-speed]")) return;
  const value = target.value;
  if (value !== "slow" && value !== "normal" && value !== "fast" && value !== "instant") return;
  settings.speed = value;
  saveSettings();
  if (effectiveSpeed() === 0 && playback?.typing) finishTyping();
  rerender();
  document.querySelector<HTMLSelectElement>("[data-dialogue-speed]")?.focus();
}

export function handleDialogueKeydown(
  event: KeyboardEvent,
  isInvestigation: boolean,
  rerender: () => void,
): void {
  if (!isInvestigation || event.repeat) return;
  const historyDialog = document.querySelector<HTMLDialogElement>("#dialogue-log");
  if (historyDialog?.open) {
    if (event.key === "Escape") {
      event.preventDefault();
      closeHistoryDialog();
    }
    return;
  }
  const target = event.target;
  if (target instanceof HTMLElement && target.closest("input, textarea, select, [contenteditable='true']")) return;
  if (event.key.toLowerCase() === "l") {
    event.preventDefault();
    showHistoryDialog();
    return;
  }
  if (event.key === "ArrowLeft") {
    event.preventDefault();
    selectPrevious();
    renderAndFocus(rerender);
    return;
  }
  const onDialogueStage = target instanceof HTMLElement && target.closest(".dialogue-stage");
  if (event.key === "ArrowRight" && !onDialogueStage) return;
  if (
    event.key !== "ArrowRight" &&
    ((event.key !== " " && event.key !== "Enter") || (target instanceof HTMLElement && target.closest("button")))
  ) return;
  event.preventDefault();
  if (historyIndex >= 0) {
    historyIndex = -1;
    renderAndFocus(rerender);
  } else if (playback?.typing) {
    finishTyping();
  } else if (playback && Date.now() - playback.finishedAt >= 150) {
    focusNextChoice();
  }
}
