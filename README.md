# The Night-Shift Archive

A short, single-player narrative roguelike prototype about working a night shift in an impossible archive. It is a static Vite + TypeScript site; there is no account system, backend, runtime AI, or paid game content.

## What is in V1

- Three independent browser save profiles.
- One archive hub and two short cases featuring Ada and Ivo.
- Time, composure, and favors, with costs shown before actions.
- Planning choices, clue-gated resolutions, and different case outcomes.
- Contextual authored NPC dialogue for first meetings, clues, spent Favors, risky clues, and deterministic déjà vu.
- Shift failure, an immediate restart, persistent profile facts, and deterministic NPC familiarity.
- A five-pip Time clock, last-Time warnings, and a shift log showing choices and persistent records.
- Responsive layouts, keyboard focus styling, reduced-motion support, and a saved larger-text preference.

The current goal is a complete, replayable slice—not an hour-long run. Each planning approach maps to a specific lead: that matching investigation action waives its 1-Time cost. Social leads cost 1 Favor, build persistent NPC familiarity, and restore 1 Composure when resolved (up to 4). Risky leads cost 2 Composure and return 1 Time when they reveal a clue. The planning screen previews the action, its resolution, costs, and benefits. Saves use `localStorage` and are local to the browser and site origin: they do not sync between friends, devices, or `localhost` and the deployed site.

The visual treatment uses the Canva moodboard as an abstract guide: ink-blue surfaces, warm paper case/profile cards, restrained brass accents, and CSS-only catalog details. No generated image is required. NPC lines are selected from authored content using current clues, Favor actions, and profile memory; no dialogue is generated at runtime. The optional reading-size control is saved in this browser independently of the three game profiles.

## V1 design guardrails

Use the games you enjoy as a **high-level design compass**, not as templates to reproduce:

- *Persona 5*: consider bold menu hierarchy and expressive contrast.
- *Baldur's Gate 3*: consider character-led choices and consequences players can understand.
- *Library of Ruina*: consider case/chapter pacing and a distinctive, restrained atmosphere.
- *Ledgerbound*: write down the specific qualities you personally value; don't assume an AI knows which ones you mean.

Do not ask AI to copy a game's exact art direction, interface, characters, dialogue, music, logo, or setting. Keep this game's names, story, visual motifs, and writing original. Describe the broad qualities you want in your own words.

## Recommended V1 workflow

Work in this order so each tool has a small, clear job:

1. **Gemini (your Student Pro account):** inspect the current progression and propose a small balance/content plan. Do not ask it to rewrite the whole project.
2. **DeepSeek (free account):** draft optional NPC dialogue variations from the approved facts and rules. Treat the results as writing suggestions, not code or canon.
3. **Canva AI:** make a compact, original moodboard and optional visual assets after the writing and UI direction are settled.
4. **Copilot in VS Code:** implement one accepted change at a time, in the existing project.
5. **Playtest with friends:** observe where they hesitate before explaining anything. Change one issue, rebuild, and test again.

AI products, plan names, free allowances, and available Canva features can change. If a feature is unavailable in your account, skip it; the game does not depend on these services. Do not paste passwords, API keys, private messages, or personal data into AI tools.

### 1. Ask Gemini to optimize progression

Open Gemini and paste the prompt below. Then paste the contents of `src/main.ts`, `src/game/rules.ts`, `src/content/cases.ts`, and `src/game/types.ts` where indicated. Include `src/main.ts` because it applies case-entry costs, action handling, and shift transitions. This asks for analysis, not a code rewrite.

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
- There are two cases, Ada's “The Bell in the Margin” and Ivo's “The Borrowed Voice.”
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

Choose only recommendations that fit the V1 guardrails. Keep the rest as future ideas rather than expanding the prototype now.

### 2. Use DeepSeek for authored NPC dialogue drafts

Use DeepSeek as an **offline writing helper**. Copy the relevant facts and rules into the prompt; review and edit every line yourself. Do not connect a model to the live game or add an API key. The shipped NPC dialogue should stay authored and deterministic.

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

The current V1 applies this direction with CSS colors, paper-like cards, catalog accents, and the Time pips. Keep any future assets decorative and optional so the interface remains legible without them.

### 4. Ask Copilot to implement one approved improvement

In Copilot Chat, attach the relevant files and paste this prompt. Replace the bracketed part with **one** accepted Gemini recommendation or one approved dialogue change.

```text
Inspect the existing Night-Shift Archive workspace and the attached files before editing.

Implement only this V1 change:
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
| Can they choose a profile and begin quickly? | They reach the hub without needing setup help. |
| Do they understand costs? | They can predict which resource a choice will spend. |
| Do they understand clue-gated resolutions? | They can explain why a resolution is unavailable or available. |
| Do they understand the ending? | They can say whether time or composure ended the shift. |
| Do they want to retry? | They choose restart without being prompted. |

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
