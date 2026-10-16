# Anish Mehta

Interactive web resume.

**Live site: [anish-mehta76.github.io/anish-mehta-resume](https://anish-mehta76.github.io/anish-mehta-resume/)**

Chemistry and public health student at Johns Hopkins. The site covers research (Lopez-Bertoni Lab, Mount Sinai, University of Michigan), service, leadership, speech & debate, music and languages. It also has a reading room of paper abstracts, interactive research explainers, a map, and a 2022 → 2026 timeline.

Need something quick? Use [Quick View](https://anish-mehta76.github.io/anish-mehta-resume/#quick-view), a plain one-page version that also prints as a PDF.

## How it's built

- Vite + vanilla TypeScript. No framework.
- All content comes from [`content/resume.json`](content/resume.json) and is pre-rendered into the HTML at build time, so the page works without JavaScript.
- Deployed to GitHub Pages by [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) on every push to `main`.

## Run it locally

```bash
npm install
npm run dev
```

`npm run build` creates the production site in `dist/` and runs a privacy check that fails the build if any private field shows up in the output.

## Updating content

Edit `content/resume.json` and push. Entries marked `"draft": true` appear in `npm run dev` only, and stay off the live site until the flag is removed.
