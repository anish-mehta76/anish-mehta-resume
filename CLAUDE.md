# Anish Mehta — Interactive Web Resume

Read `PLAN.md` first. It is the roadmap; work phase by phase and stop at each checkpoint.

## Sources of truth
- Content: `content/resume.json` (from the resume PDF + LinkedIn). Never hard-code resume text in the site.
- Design: `design/decision.md` > `design/aesthetic-brief.md` > `design/tokens.json`.

## Agents
- `aesthetics-finder`: researches current web aesthetics and writes the brief and tokens. It does not write site code.
- `aesthetics-builder`: implements the chosen direction. It does not invent new aesthetics.
- The handoff between them is files in `design/`, relayed by the main session after Anish chooses a direction.

## Rules
- The public site shows email + LinkedIn only. Never publish fields marked `"private": true` (phone, street address).
- Don't change facts, numbers or dates. If something looks inconsistent, ask Anish.
- A Quick View (plain, scannable) must always be one click away.
- Respect `prefers-reduced-motion`. No audio autoplay.
- Original work only: be inspired by reference sites, never copy their assets, copy or branding.
