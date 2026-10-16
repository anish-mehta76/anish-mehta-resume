# Interactive Resume — Build Plan (for Claude Code)

**Owner:** Anish Mehta · **Goal:** a creative, interactive web resume that admissions readers, research PIs, and others can open from a link, understand in 30 seconds, and explore for 5 minutes.

Open this folder in Claude Code and work through the phases in order. Each phase ends with a **checkpoint**: show Anish the result before moving on.

---

## 0. How the pieces fit

```
content/resume.json  ──────────────┐
(resume PDF + LinkedIn, merged)    │
                                   ▼
aesthetics-finder ──► design/aesthetic-brief.md ──► Anish picks a direction
 (researches current               design/references.md          │
  award-level sites)                                             ▼
                                   aesthetics-builder ──► src/ (the site)
                                   (implements the chosen direction
                                    using resume.json as the only content)
```

Subagents in Claude Code can't call each other directly. **The finder hands off to the builder through files** (`design/aesthetic-brief.md`, `design/tokens.json`). The main Claude Code session runs the finder, shows Anish the options, records his pick, then runs the builder.

Both agents are defined in `.claude/agents/`. Project rules for every session are in `CLAUDE.md`.

---

## Phase 1 — Content (single source of truth)

1. `content/resume.json` has already been extracted from `Mehta_Anish_Resume_Hopkins_Research copy.pdf`. Review it for typos.
2. **LinkedIn merge.** LinkedIn blocks automated fetching. Pick one:
   - On LinkedIn, open your profile and choose **More → Save to PDF**. Put the file in this folder as `linkedin.pdf`, or
   - Paste your About section, any posts or featured items, and recommendations into `content/linkedin-notes.md`.

   Then tell Claude Code: *"Merge linkedin.pdf into content/resume.json. Add new items, flag conflicts, and don't overwrite resume wording without asking."*
3. Add what a website can show and a PDF can't (all optional, in `content/media/`):
   - headshot
   - a 20–40s saxophone clip (Fat Cats Big Band / Belongó)
   - a Science Chronicles screenshot or logo
   - Witness Stones photos
   - a debate trophy photo
4. Write a 2–3 sentence personal tagline and a short "what I'm looking for" line. Claude can draft options.

**Checkpoint:** Anish approves `resume.json`.

> Privacy: the public site shows **email + LinkedIn only**. The phone number and street-level location stay out of the public data (`resume.json` marks them `"private": true`).

---

## Phase 2 — Aesthetic research (`aesthetics-finder`)

Prompt in Claude Code:

> Use the aesthetics-finder agent. Research current (2025–2026) award-level personal sites, portfolios and interactive resumes, then write design/aesthetic-brief.md with 3 directions tailored to my story.

The finder will:

- survey Awwwards, the FWA, CSS Design Awards, Godly, SiteInspire, Codrops, One Page Love, Typewolf, Fonts In Use and recent trend write-ups
- collect 10–15 reference projects, each with a link and the specific technique worth borrowing
- group them into trend clusters, e.g. kinetic type, editorial/Swiss grids, WebGL/3D scenes, brutalism, scroll-driven storytelling, bento layouts, grain/analog textures, cursor-reactive UI
- propose **3 directions** that map onto Anish's themes:
  - science: chemistry, PCOS AI model
  - public health and service: MSK, Science Chronicles, Language Gurus
  - voice: debate, Board of Education
  - jazz: lead saxophone
  - languages and history: English, Hindi, Spanish, Catalan; colonial and diaspora research
- give each direction a palette, type pairing, motion language and one signature interaction, plus its performance and accessibility cost

Example directions it might arrive at, for illustration only:

| Direction | Idea | Signature interaction |
|---|---|---|
| **Liner Notes** | Site styled as a jazz record sleeve and liner notes; each section is a "track" | Spinning-record scrubber that navigates sections; optional sax clip |
| **Periodic Self** | Chemistry-inspired grid where each experience is an "element" (symbol, number, mass = impact metric) | Click an element to "react" it open; filter by group (Research / Service / Voice / Music) |
| **Field Notebook** | Editorial, archival research-journal look with handwritten annotations and footnotes | Footnote-style hover reveals; timeline 2022→2026 drawn as you scroll |

**Checkpoint:** Anish picks one direction, or a hybrid. Claude writes the choice to `design/decision.md`, and the finder produces `design/tokens.json` for it.

---

## Phase 3 — Build (`aesthetics-builder`)

**Stack:** Vite + vanilla TypeScript, CSS custom properties from `tokens.json`, GSAP + ScrollTrigger for motion, and Lenis only if smooth scroll fits the direction. Three.js/OGL only if the chosen direction needs WebGL, and it must be lazy-loaded. There's no framework and no CMS, so all content renders from `resume.json`.

Prompt:

> Use the aesthetics-builder agent to scaffold the site from design/aesthetic-brief.md, design/decision.md and design/tokens.json. Build section by section and stop after each for review.

Build order:

1. Scaffold, tokens, fonts, base layout, and a **Quick View** toggle. Quick View is a plain, fast, scannable one-page version for busy reviewers and is always one click away.
2. Hero: name, tagline, focus areas, links, and a Download PDF button.
3. Impact numbers: 30k+ students taught, 160k+ reads, $350k+ prep distributed, 20k+ students, 1k+ patients, $80k+ raised.
4. Research: Mount Sinai PCOS model, Michigan diaspora archive, and the independent studies.
5. Service and leadership: Science Chronicles, Language Gurus, MSK, Board of Education, Class President.
6. Voice: Speech & Debate record and coaching.
7. Music: ALJA / Fat Cats Big Band, Interlochen–NY Phil scholarship, optional audio.
8. Honors: filterable by category.
9. Languages: English, Hindi, Spanish, Catalan, shown interactively (e.g. greeting switcher).
10. Contact and footer.

**Checkpoint after each section.**

---

## Phase 4 — Interactivity and delight (pick 3–5, don't do all)

- Section navigation that matches the theme (record tracks / element groups / notebook tabs)
- Filter chips: Research · Service · Leadership · Debate · Music
- Animated counters that respect `prefers-reduced-motion`
- 2022 → 2026 timeline scrubber
- Command palette (`/` or ⌘K) to jump to sections, with quick answers like "What's his research?"
- Easter egg: Konami code plays a sax riff
- Dark/light theme
- Shareable deep links per section (`#research`, `#debate`)

---

## Phase 5 — Quality bar (must pass before deploy)

- **Accessibility:** semantic HTML, keyboard-navigable, visible focus, alt text, WCAG AA contrast, full `prefers-reduced-motion` fallback
- **Performance:** Lighthouse ≥ 90 on mobile in all categories, LCP < 2.5s, total JS < 200 KB gz (excluding a lazy WebGL chunk), fonts subset with `font-display: swap`
- **Responsive:** 360px phone → 1440px+ desktop, no horizontal scroll
- **Works without JS:** content is still readable
- **Print:** `@media print` produces a clean one-page resume, and a real PDF is linked
- **SEO/share:** title, meta description, Open Graph image, favicon
- **Proofread:** every number and date matches `resume.json`
- **Privacy:** no phone or address in the built output (grep the `dist/` folder)

Prompt:

> Run the Phase 5 checklist. Use Playwright to screenshot at 375, 768 and 1440, check reduced-motion, run Lighthouse, and report failures with fixes.

---

## Phase 6 — Deploy

1. `git init`, push to a GitHub repo (`anish-mehta-resume`).
2. Deploy on Vercel, Netlify or GitHub Pages (all free).
3. Optional: a custom domain such as `anishmehta.com` (~$12/yr).
4. Add the URL to LinkedIn's Featured section, the PDF resume header and email signatures.
5. Optional: add privacy-friendly analytics (Plausible / Umami) to see when reviewers visit.

---

## Phase 7 — Keeping it current

- Update `content/resume.json` only. The site and the print view rebuild from it.
- Re-run `aesthetics-finder` once a year for a refresh. Content stays separate from design.

---

## Open questions for Anish

1. Primary audience: **general** (answered 2026-10-15).
2. Lead with **public health and science** (answered).
3. Sax recording: Anish will send media after the framework is built.
4. Hosting: **GitHub Pages** (`.github/workflows/deploy.yml` is ready).

## Status (2026-10-15)
- Phase 1 content approved. Tagline, looking_for and focus_areas are drafts in `resume.json`.
- Built the framework ahead of Phase 2 at Anish's request: every section renders from `resume.json` using **placeholder** tokens (`src/styles/tokens.css`). Next: media from Anish, then the aesthetics-finder → decision → builder pass replaces the placeholder look.
- 2026-10-16: Phase 4 features added ahead of the design pass: reader lens switch (`?for=research|scholarship|admissions|music`, also reorders Quick View/print), reading room (3 abstracts), reach map, 2022→2026 timeline scrubber. Drafts (dev only until approved): PCOS explainer, glioblastoma pathway graphic, Hindi/Spanish/Catalan intros. Open questions are in `resume.json` → `_meta.review_notes`.
