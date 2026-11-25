# The Night-Shift Archive

A single-player narrative roguelike about filing unfinished stories across a sequence of night shifts. It is a static Vite + TypeScript site: no backend, account system, runtime AI, or paid game content.

## What is in V1.6

- Three independent browser profiles and a six-case campaign across three chapters.
- Four new cases and NPCs follow Ada and Ivo's opening chapter.
- Case planning, clue-based resolutions, and authored alternative outcomes.
- Time, Composure, and Favors with visible costs; zero Time or Composure ends a shift.
- Chapter progress and resolved cases persist. Shift resources reset; facts and NPC familiarity carry forward.
- Earlier case outcomes can change later NPC dialogue; replay keeps memories and can expose other endings.
- Responsive layouts, keyboard focus, reduced-motion support, and a saved larger-text preference.
- Dialogue has a typewriter, optional quiet SFX, speed controls, auto-focus, history, and backstep.

The campaign is **designed toward** a 45–60 minute first playthrough when players read the case scenes and try different leads. That duration has not been established by timed player tests; measure it with friends before advertising it as a one-hour game.

| Chapter | Cases |
| --- | --- |
| 1 · The first record | The Bell in the Margin · The Borrowed Voice |
| 2 · Rooms out of order | The Return Address · The Shelf That Moved |
| 3 · Before the index closes | The Last Lamp · The Morning Index |

Each approach previews a matching lead that waives its 1-Time investigation cost. Social leads cost 1 Favor and build NPC familiarity; resolving their matching clue restores 1 Composure (up to 4). Risky leads cost 2 Composure and return 1 Time. A case becomes a lasting campaign record only after it is resolved. Some later characters react to those exact recorded outcomes. If a shift ends early, unfinished cases return next shift. Replaying the campaign resets case completion but retains profile facts and NPC memories.

Saves use `localStorage` and are local to this browser and site origin; they do not sync between friends, devices, or `localhost` and the deployed site.

## V1.6 dialogue controls

The investigation dialogue is reactive to the current case state, rather than a linear visual-novel scene. Finishing a line never advances past a conversation or spends a resource. Auto mode waits, then focuses the next available investigation or resolution choice; it never selects that choice for you.

| Input / control | Effect |
| --- | --- |
| Click dialogue / Space / Enter / → | Finish typing; once complete, focus the next available choice. A 150 ms guard prevents a fast second input from skipping onward. |
| ← / Previous | Read the prior line in this profile's current-session dialogue history. |
| Return to current line | Exit a backstep and return to the active case reaction. |
| Log / L | Open the scrollable dialogue transcript. Selecting a past line lets you reread it. |
| Text | Slow (40 ms), Normal (24 ms), Fast (10 ms), or Instant. The selected setting applies as text types and is saved in this browser. |
| SFX | Optional, off by default. Uses a quiet triangle-wave blip with pitch variation every third eligible character. |
| Auto | Waits at least 1.2 seconds after a line, then focuses the next available choice without activating it. |

The dialogue box measures the full line invisibly beneath the visible typewriter text so wrapping does not make the panel jump as characters appear. On devices set to reduced motion, text appears instantly and shake/wave animations are disabled. The transcript is kept in memory for the active profile and browser session; it is not saved with campaign progress. Dialogue preferences are browser-local and shared across the three profiles.

Dialogue text is authored in `src/content/cases.ts`. A few supported inline tags demonstrate the system:

| Markup | Effect |
| --- | --- |
| `{pause:300}` | Pause typing for 300 ms (values are capped at 2,000 ms). |
| `{speed:60}...{/speed}` | Temporarily set the typing delay in milliseconds. |
| `*italic*` / `**bold**` | Emphasize a word or phrase. |
| `{color:#e0b36f}...{/color}` | Apply a six-digit hex text color. |
| `{shake}...{/shake}` / `{wave}...{/wave}` | Apply a subtle motion effect; reduced-motion mode disables these. |

Controls and markup are intentionally small: dialogue remains authored and deterministic, and no text is sent to an AI service.

### Quick campaign playtest path

1. Start Profile 1 and resolve both opening cases with the planned matching leads.
2. Close the shift. Resolve a case in Chapter 2 and notice the other NPC's line refers to the fact you just filed.
3. Finish the current chapter, then verify the next opens on the following shift.
4. Finish all six cases; the summary should offer a campaign replay that keeps memories.
5. Replay and choose different case endings. Check that later dialogue follows the newly recorded fact, not a random roll.

The visual treatment uses the Canva moodboard as an abstract guide: ink-blue surfaces, warm paper case/profile cards, restrained brass accents, and CSS-only catalog details. No generated image is required. NPC lines are selected from authored content using current clues, Favor actions, and profile memory; no dialogue is generated at runtime. The optional reading-size control is saved in this browser independently of the three game profiles.

## V1 design guardrails

Use the games you enjoy as a **high-level design compass**, not as templates to reproduce:

- *Persona 5*: consider bold menu hierarchy and expressive contrast.
- *Baldur's Gate 3*: consider character-led choices and consequences players can understand.
- *Library of Ruina*: consider case/chapter pacing and a distinctive, restrained atmosphere.
- *Ledgerbound*: write down the specific qualities you personally value; don't assume an AI knows which ones you mean.

Do not ask AI to copy a game's exact art direction, interface, characters, dialogue, music, logo, or setting. Keep this game's names, story, visual motifs, and writing original. Describe the broad qualities you want in your own words.

## V1.5 idea bank and V2 AI-helper round

The current campaign is an authored starting point, not a promise that every idea below belongs in the game. Use the prompts in order; save each response locally, decide what is useful, then ask Copilot to implement one approved change at a time. Do not send private player information or secrets to an AI tool.

### Ideas to explore

- **Replay:** What should change on a second campaign besides one déjà-vu line? Look for a new interpretation, not a grind reward.
- **Case variety:** Could cases use different clue requirements, resource pressures, or resolution trade-offs without adding a fourth resource?
- **Consequences:** Which prior file could alter a later character's reaction or option? Make the link understandable and deterministic.
- **Pacing:** Where should a chapter end, and what can be cut if playtests exceed an hour?
- **Player comfort:** Is text easy to scan on a phone? Are costs, focus states, and the reading-size control obvious?
- **Distinct identity:** Which archive-specific rule, ritual, or visual motif could only belong to this setting?

### 1. Gemini V2: check campaign pacing and gameplay

In Gemini, paste this prompt and attach or paste the current `src/content/cases.ts`, `src/main.ts`, `src/game/rules.ts`, `src/game/save.ts`, and `src/game/types.ts`. Ask for analysis first; the one-hour duration is a playtest target, not a measured fact.

```text
Act as a progression designer reviewing my original browser game, The Night-Shift Archive. This is a V2 review of the CURRENT workspace, not the old two-case prototype. Inspect the source I provide before making claims.

CURRENT SHAPE
- Six authored cases across three chapters. Each shift starts with 5 Time, 4 Composure, and 2 Favors.
- Entering a case costs 1 Time. Planning its matching lead waives that lead's 1-Time cost.
- Social leads spend 1 Favor and persist NPC familiarity; their matching resolution restores up to 1 Composure.
- Risky leads spend 2 Composure and return 1 Time when they reveal a clue.
- A resolution requires its clue and 1 Time. Zero Time or Composure ends the shift.
- Resolved cases and chapters persist; run resources reset. Facts and NPC memories persist per profile.
- Replay resets campaign case completion but keeps memories, enabling deterministic changed dialogue.
- Specific earlier case endings change later NPC lines; they are authored fact-to-line links, not random reactions.
- UI should be concise: costs, clues, and consequences must be clear without repeating tutorial paragraphs.

TASK
1. Trace the actual campaign progression and list any dead ends, unreachable cases, or save/migration risks you can prove from the source.
2. Assess whether the current case loops offer distinct choices and meaningful replay. Cite the case/action IDs you inspected.
3. Give at most five small improvements, ranked by player impact. Include one idea to make this archive's gameplay identity more distinctive without imitating another game.
4. Check whether prior-file reactions actually reflect `Profile.facts` and suggest one safe way to make a later case consequence matter mechanically, without adding a resource.
5. Propose a 5-player timing/playtest plan for checking the intended 45–60 minute first-campaign target. Do not claim the duration is verified from code.
6. Flag repeated or unnecessary interface wording with exact phrases to shorten.

CONSTRAINTS
- Analysis only; do not generate code or rewrite the story.
- Do not add a resource, backend, account, runtime AI, daily reward, or filler.
- Preserve deterministic authored NPC behavior and the three-profile local saves.
- Use only high-level inspiration (dramatic menu contrast, character-led decisions, chapter atmosphere). No copied characters, dialogue, settings, signature UI, or art.
- Separate source-verified facts from assumptions. Prefer cutting/reworking content over increasing playtime through repetition.
```

### 2. DeepSeek V2: draft one NPC's replay-aware lines

Use DeepSeek as an offline writing helper, not a live game feature. Run this prompt separately for each NPC; paste that NPC's case entry and the relevant code-defined mechanics from `src/content/cases.ts`. Review every line before accepting it.

```text
Write a compact set of ORIGINAL, authored dialogue options for one character in The Night-Shift Archive. This is an offline writing task. Do not write code, add runtime AI, or imitate any existing game.

I will provide the NPC's current case entry and their needs/concerns. Keep those facts unchanged.

Return up to five short lines for these actual states:
1. First meeting.
2. A non-risky clue has been found.
3. The NPC's social/Favor clue has been found (the Favor is already spent).
4. A risky clue has been found.
5. Déjà vu on a later loop, only if this NPC was previously remembered.

Rules:
- One or two short sentences per line; cut exposition that repeats the case summary.
- No new choice buttons, clues, resources, clue rewards, persistent flags, or mechanics.
- Do not imply the player paid a cost unless the provided action does.
- Do not write random reactions. Each line must fit its named deterministic trigger.
- Keep the NPC's voice and concern distinct from the other archive characters.
- Mark any optional new story fact as OPTIONAL instead of presenting it as canon.
- Return a small table with trigger, line, and any source fact it relies on. No lore essay.
```

### 3. Canva AI V2: strengthen the archive's visual identity

Ask for a moodboard or a compact design system, not a finished game screen. Keep generated text out of images. Use the existing moodboard as a starting point, and request one recognizable motif for each chapter that can be recreated with CSS.

```text
Create an ORIGINAL one-page visual direction sheet for “The Night-Shift Archive,” a responsive browser narrative game about filing unfinished stories over three night-shift chapters.

Keep the established palette: ink-blue and charcoal, warm paper, and restrained brass. Propose a distinctive archive-specific identity using original catalog marks, marginalia, paper edges, a bell, sound-wave lines, or an index motif. Give each chapter a subtle, related variation without making the interface harder to scan.

Return:
- A compact palette with HEX values and contrast-conscious usage notes.
- Two readable font pairings with common fallbacks.
- Three simple motifs achievable in CSS.
- One optional, subtle texture that does not reduce text contrast.
- A mobile adaptation note for case cards and dialogue choices.

Do not copy or recreate any game's characters, symbols, logo, layout, typography treatment, or artwork. No words embedded in generated artwork. Actual text, costs, focus states, and controls remain HTML/CSS and usable without images.
```

### 4. Keep a decision log before asking Copilot to change code

Copy this small table into your own notes (or add reviewed decisions below). AI responses are suggestions, not requirements. Keep the final wording and content under your control.

| Idea / exact source | Player benefit | Files or content affected | How to test | Decision |
| --- | --- | --- | --- | --- |
| Example: make the second chapter reflect a filed case | Consequences feel connected | `cases.ts`, `main.ts` | Compare the deterministic line on two profiles | Keep / revise / skip |
|  |  |  |  |  |

After you collect V2 output, paste only the accepted idea into Copilot's implementation prompt below. Do not ask Copilot to implement an entire unreviewed AI response.

## Recommended V1.5 workflow

Work in this order so each tool has a small, clear job:

1. **Gemini (your Student Pro account):** use the V2 campaign review prompt above. Ask for source-grounded feedback, not a rewrite.
2. **DeepSeek (free account):** use the V2 prompt one NPC at a time for short, trigger-specific dialogue. Treat every line as a draft.
3. **Canva AI:** use the V2 moodboard prompt above for optional visual direction; don't generate a complete game screen.
4. **Copilot in VS Code:** implement one accepted change at a time, in the existing project.
5. **Playtest with friends:** observe where they hesitate before explaining anything. Change one issue, rebuild, and test again.

AI products, plan names, free allowances, and available Canva features can change. If a feature is unavailable in your account, skip it; the game does not depend on these services. Do not paste passwords, API keys, private messages, or personal data into AI tools.

### Optional: use the original Gemini prompt for the opening chapter only

The V2 prompt above covers the whole campaign. This older, narrower prompt can still help you evaluate Ada and Ivo's opening chapter. Paste the current source; do not treat its two-case scope as the full game.

```text
Act as a progression and systems editor for my ORIGINAL small browser game, The Night-Shift Archive. Review the source excerpts I paste at the end before making recommendations.

DESIGN GOAL
Make the first shift easy to understand, short, replayable, and tense without grind, daily rewards, accounts, battle passes, or filler. Players should make meaningful choices, understand costs before selecting them, and see why a shift ended.

CURRENT RULES TO VERIFY AGAINST THE SOURCE
- One shift starts with 5 Time, 4 Composure, and 2 Favors.
- Entering a case costs 1 Time.
- The investigation action matching the selected approach waives its 1-Time cost. Other actions cost 1 Time.
- Social actions also cost 1 Favor, increment NPC familiarity, and their matching resolution restores 1 Composure (up to 4).
- Risky actions cost 2 Composure and return 1 Time after revealing a clue.
- Resolving a case costs 1 Time and requires a related clue.
- A shift ends when Time or Composure reaches zero.
- The opening chapter has Ada's “The Bell in the Margin” and Ivo's “The Borrowed Voice”; four later cases unlock in chapters two and three.
- Profile facts and NPC familiarity may persist; run resources and case progress reset on restart.

TASK
1. Summarize the current first-shift path in 5 steps or fewer.
2. Make a cost table for the cheapest valid resolution path for each case. Check whether a player can resolve both cases in one shift using matching approaches; do not guess—show the arithmetic from the source. Also explain what optional actions can consume the remaining Time.
3. Identify at most three points where a new player could hesitate or misunderstand a consequence.
4. Recommend at most three small changes, ordered by impact. Preserve the three resources and short-run scope.
5. Give a 5-minute friend-playtest checklist with observable success criteria.

CONSTRAINTS
- Analyze first; do not write TypeScript or rewrite story content.
- Preserve existing mechanics unless you explain a specific problem and the smallest fix.
- Do not add a resource, progression grind, backend, account, live-service feature, or runtime AI.
- No random NPC reactions for important story moments.
- Use only abstract design qualities, never recreate another game's characters, dialogue, setting, signature UI, or art.
- Label assumptions. If the source contradicts the rules above, trust the source and point out the mismatch.

SOURCE EXCERPTS:
[Paste src/main.ts]
[Paste src/game/rules.ts]
[Paste src/content/cases.ts]
[Paste src/game/types.ts]
```

Choose only recommendations that fit the originality, scope, and accessibility guardrails above. Keep larger ideas in the idea bank until a friend playtest shows they are worth building.

### Optional: original DeepSeek prompt for Ada and Ivo

For the four later NPCs, use the V2 per-character prompt above. This earlier prompt remains a quick writing helper for Ada and Ivo only. Review every line yourself. Do not connect a model to the live game or add an API key.

```text
Help me draft short, ORIGINAL dialogue for the two NPCs in my narrative game, The Night-Shift Archive. This is a writing exercise only; do not write code or invent an AI-powered runtime.

CHARACTERS
- Ada is a margin archivist. She needs to know a story can end without erasing what mattered. She worries the bell in its unfinished pages is calling someone who will never arrive.
- Ivo is a sound conservator. He wants to protect voices entrusted to the archive. He worries that listening closely will make a recording take another visitor's voice.

GAME RULES
- The player has limited Time, Composure, and Favors.
- Clues and player choices are authored and deterministic.
- The planned approach matches one lead action; that action waives its 1-Time cost. Other actions show their full costs.
- A social clue costs 1 Favor, builds persistent NPC familiarity, and restores 1 Composure (up to 4) when its matching resolution is selected.
- A risky clue costs 2 Composure and returns 1 Time after the clue is found.
- Resolutions cost 1 Time and require a related clue.
- Ada or Ivo may show déjà vu only after the player has met them in an earlier loop. Make this a clear conditional line, not a random chance.
- Keep each line to one or two short sentences, natural to read in a browser dialogue panel.

RETURN
For each NPC, provide:
1. One first-meeting line.
2. One response after the player finds the case's non-risky clue.
3. One response after the player spends a Favor to talk with them.
4. One déjà-vu line for a later loop, used only if the player previously spoke with them.
5. If useful, one short reaction after the existing risky clue.

Do not invent new choice buttons, clues, resource rewards, or persistent states. The game already owns the choices and their costs. Do not change the established character needs or concerns. Do not add new plot facts unless you mark them OPTIONAL. Do not imitate any named game's dialogue, characters, setting, or distinctive phrasing. Return a compact table; do not add lore essays.
```

Keep only lines that match the existing rules. The prototype uses authored reactions for first meetings, non-risky clues, risky clues, spent Favors, and later-loop recognition; new free clues and next-loop Favor bonuses are intentionally excluded because they would change the current economy. Put accepted writing into the authored content files and test each condition in a real run. Never send player text to DeepSeek from the live site.

### 3. Make an original Canva moodboard

Use Canva AI after deciding which writing and UI changes to keep. Request a moodboard or one-page style guide, not a full game screen full of generated text. AI-generated text in images is often hard to read; keep actual interface text in HTML.

```text
Create a one-page ORIGINAL visual moodboard for a small, responsive browser game called “The Night-Shift Archive.” It is about a quiet overnight archive that stores unfinished stories.

VISUAL DIRECTION
- Dark ink-blue and charcoal surfaces, warm paper, and a restrained brass-lamp accent.
- Clear, high-contrast information hierarchy for case cards, resource costs, clues, and dialogue choices.
- A few original abstract motifs: catalog marks, marginalia, paper edges, a small archive bell, and sound-wave lines.
- The mood should feel literary, uncanny, and character-focused—not horror gore and not a copy of an existing game.
- Treat the following only as abstract references: bold menu contrast, character-focused choices, and chapter/case atmosphere. Do not reproduce any game's layout, logo, symbols, characters, typography treatment, or artwork.

DELIVER
- A compact palette with usable HEX values.
- Two readable font suggestions with common web-safe fallbacks.
- Three simple UI motif ideas that can be recreated with CSS.
- One optional, subtle background texture suggestion.
- No logos, copyrighted characters, copied interfaces, tiny text, or words embedded in generated artwork.

The existing game must remain readable and usable without any generated image assets.
```

Export only assets you actually use. Prefer a small compressed image or CSS treatment; keep text, buttons, focus states, and resource values as accessible HTML/CSS.

The current V1.5 applies this direction with CSS colors, paper-like cards, catalog accents, and the Time pips. Keep any future assets decorative and optional so the interface remains legible without them.

### 4. Ask Copilot to implement one approved improvement

In Copilot Chat, attach the relevant files and paste this prompt. Replace the bracketed part with **one** accepted Gemini recommendation or one approved dialogue change.

```text
Inspect the existing Night-Shift Archive workspace and the attached files before editing.

Implement only this V1.6 change:
[Describe one small, testable change.]

Constraints:
- Preserve the current Vite + TypeScript + semantic HTML/CSS structure.
- Keep the game static: no backend, account system, external AI call, API key, or new dependency.
- Keep all characters, wording, visuals, and mechanics original.
- Preserve the three independent localStorage profiles, visible costs, deterministic memories, and responsive keyboard-accessible UI.
- Check the result at desktop width and narrow mobile widths; keep buttons touch-friendly and text readable.
- Keep the optional larger-text preference available on every screen.
- Do not overwrite unrelated work. If the requested change conflicts with the current game rules, explain the smallest safe adjustment first.
- Run `npm run build` after editing and report the exact result. Do not claim tests passed unless you ran them.

Before editing, list the files you expect to change. Afterward, summarize the diff and give me a short manual test path.
```

### 5. Playtest and tune progression

Ask two or three friends to play without coaching. Watch for behavior rather than asking whether they “liked it.” Record:

| What to observe | Good V1 signal |
| --- | --- |
| Can they begin without coaching? | They reach the first case quickly. |
| Do they understand costs? | They predict which resource a choice spends. |
| Do clues lead clearly to an ending? | They explain why a resolution is available. |
| Does campaign progress make sense? | They know why another chapter unlocked or a case returned. |
| How long does the first campaign take? | Record start-to-finish time for each tester; compare median to 45–60 minutes. |
| Do they want to replay? | They start again to test a different case outcome. |

After each session, fix the single most repeated point of confusion. Avoid adding more tutorial text if a button label, cost, or outcome message can explain the rule.

## Run and verify locally

Open this folder in VS Code, then use the integrated terminal:

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. To verify the production build:

```sh
npm run build
```

The build command runs TypeScript checks before producing `dist/`. There is currently no separate test or lint script configured.

## Useful VS Code extensions

The built-in TypeScript, HTML, CSS, and Git support is enough to work on this project. Optional extensions:

- **Prettier - Code formatter** (`esbenp.prettier-vscode`) for consistent formatting.
- **Error Lens** (`usernamehw.errorlens`) to show diagnostics inline.
- **Code Spell Checker** (`streetsidesoftware.code-spell-checker`) for catching typos in authored dialogue.
- **GitLens** (`eamodio.gitlens`) if you want richer history views after creating a Git repository.

Avoid installing several extensions “just in case.” Use Vite's `npm run dev`, not Live Server, to run this app. An end-to-end testing extension is only useful if you decide to add Playwright tests.

## Publish with Vercel

This project is configured for a standard Vite deployment in [`vercel.json`](./vercel.json): build command `npm run build`, output directory `dist`. It has **not** been linked to a Vercel account or deployed.

### Push the project to GitHub

If this folder is not already connected to GitHub:

1. Create a new, empty repository on GitHub. Do not add a README there; this folder already has one.
2. In VS Code, open **Terminal → New Terminal** in this project folder and run:

   ```sh
   git init
   git add .
   git commit -m "Initial Night-Shift Archive prototype"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPOSITORY.git
   git push -u origin main
   ```

3. Replace `YOUR-USERNAME` and `YOUR-REPOSITORY` with your GitHub details. If a Git remote already exists, keep it and skip `git remote add origin`.

### Import into Vercel

1. Sign in to Vercel and choose **Add New → Project**.
2. Connect GitHub if asked, then select the repository you just pushed.
3. Set the project root to the repository root. Confirm the Vite framework, build command `npm run build`, and output directory `dist` (these values are also in `vercel.json`).
4. Choose **Deploy**. No environment variables are needed.
5. Open the deployment URL and test profile creation, one complete case, a failure/restart, and a browser refresh.
6. Share the URL with friends. Test on a phone or narrow browser width too.

Each deployment origin has its own browser saves. For example, saves at `localhost` will not appear on the Vercel URL, and a friend's browser will have separate saves from yours. This prototype has no shared multiplayer state.
