import type { Photo, Entry, GbmExplainer, Honor, ImpactNumber, Paper, PcosExplainer, Place, Resume } from './types';
import { SECTION_LABELS, SECTION_ORDER } from './sections';
import { CHART, scores, toChart } from './pcos';
import { landDotsPath, mapHeight, MAP, project } from './build/worldDots';

// Pure string templates: used at build time (vite.config.ts) to pre-render the page.
// All resume text comes from the Resume object; only UI labels live here.

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const dates = (start: string, end: string | null) => `${start}–${end ?? 'Present'}`;

const draftBadge = (o: { draft?: boolean }) =>
  o.draft ? '<span class="draft-badge" title="Only visible in dev until approved">Draft</span>' : '';

export function formatImpact(n: ImpactNumber, value = n.value): string {
  const body = value >= 1000 ? `${Math.round(value / 1000)}k` : String(value);
  return `${n.prefix ?? ''}${body}${n.suffix ?? ''}`;
}

const honorTags = (h: Honor) => [slug(h.category), ...(h.tags ?? [])].join(' ');

/* Seeded random numbers so the pre-rendered graphics are identical on every build. */
function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

function entry(e: Entry): string {
  return `
    <article class="entry" data-tags="${esc(e.tags.join(' '))}">
      <header class="entry__head">
        <h3 class="entry__org">${esc(e.org)}</h3>
        <p class="entry__role">${esc(e.role)}</p>
        <p class="entry__meta"><span>${esc(e.location)}</span><span aria-hidden="true"> · </span><time>${dates(e.start, e.end)}</time></p>
      </header>
      <ul class="entry__bullets">${e.bullets.map((b) => `<li>${esc(b)}</li>`).join('')}</ul>
    </article>`;
}

function honorItem(h: Honor): string {
  return `<li class="honor" data-category="${esc(slug(h.category))}" data-tags="${esc(honorTags(h))}">
    <span class="honor__title">${esc(h.title)}</span>
    <span class="honor__years">${esc(h.years.join(', '))}</span>
  </li>`;
}

function section(id: string, title: string, inner: string, kicker = ''): string {
  return `
  <section id="${id}" class="section" aria-labelledby="${id}-title" data-section>
    <div class="section__inner">
      <header class="section__head">
        ${kicker ? `<p class="section__kicker">${esc(kicker)}</p>` : ''}
        <h2 id="${id}-title" class="section__title">${title}</h2>
      </header>
      ${inner}
    </div>
  </section>`;
}

function introSwitch(r: Resume): string {
  const t = r.person.intro_translations ?? [];
  if (t.length < 2) return '';
  return `<div class="intro-switch js-only" role="group" aria-label="Read the intro in another language"><span class="intro-switch__label">Read in</span>
    ${t
      .map(
        (x, i) =>
          `<button type="button" class="intro-switch__btn" lang="${esc(x.lang)}" aria-pressed="${i === 0}" data-intro-lang="${esc(x.lang)}" data-intro-text="${esc(x.text)}">${esc(x.label)}${x.draft ? '*' : ''}</button>`,
      )
      .join('')}
    ${t.some((x) => x.draft) ? '<span class="draft-badge" title="Translations marked * are drafts">Draft*</span>' : ''}
  </div>`;
}

function photo(ph: Photo, cls: string, sizes: string, eager = false): string {
  const srcset = ph.widths.map((w) => `${esc(ph.src)}-${w}.webp ${w}w`).join(', ');
  const largest = ph.widths[ph.widths.length - 1];
  const img = `<img src="${esc(ph.src)}-${largest}.webp" srcset="${srcset}" sizes="${sizes}" width="${ph.width}" height="${ph.height}" alt="${esc(ph.alt)}" ${
    eager ? 'fetchpriority="high"' : 'loading="lazy"'
  } decoding="async" />`;
  return `<figure class="${cls}">${img}${ph.caption ? `<figcaption>${esc(ph.caption)}</figcaption>` : ''}</figure>`;
}

/** Puts a photo beside a section's content when one is configured. */
const withPhoto = (inner: string, ph?: Photo) =>
  ph ? `<div class="with-photo"><div class="with-photo__main">${inner}</div>${photo(ph, 'side-photo', '(max-width: 760px) 90vw, 320px')}</div>` : inner;

function hero(r: Resume): string {
  const p = r.person;
  const jhu = r.education[0];
  const logo = r.media?.school_logo;
  const headshot = r.media?.headshot;
  return `
  <section id="hero" class="hero" aria-labelledby="hero-name">
    <div class="section__inner hero__grid">
      <div class="hero__text">
      <p class="hero__edu">${
        logo ? `<img class="hero__logo" src="${esc(logo.src)}" alt="${esc(logo.alt)}" width="28" height="28" />` : ''
      }<span>${esc(jhu.school)} · ${esc(jhu.display_dates ?? dates(jhu.start, jhu.end))}</span></p>
      <h1 id="hero-name" class="hero__name">${esc(p.name)}</h1>
      ${jhu.degrees ? `<p class="hero__degrees">${jhu.degrees.map(esc).join(' · ')}</p>` : ''}
      <p class="hero__tagline" lang="en" data-intro aria-live="polite">${esc(p.tagline)}</p>
      <div class="hero__actions">
        <a class="btn btn--primary" href="mailto:${esc(p.email)}">Email me</a>
        <a class="btn" href="${esc(p.links.linkedin)}" rel="noopener" target="_blank">LinkedIn</a>
        <span class="hero__links"><a href="#quick-view">Quick View</a><button class="linklike js-only" type="button" data-print>Download PDF</button></span>
      </div>
      ${introSwitch(r)}
      </div>
      ${headshot ? photo(headshot, 'hero__photo', '(max-width: 760px) 140px, 320px', true) : ''}
    </div>
  </section>`;
}

function impact(r: Resume): string {
  const items = r.impact_numbers
    .map(
      (n) => `<li class="stat">
        <span class="stat__value" data-count="${n.value}" data-prefix="${esc(n.prefix ?? '')}" data-suffix="${esc(n.suffix ?? '')}">${esc(formatImpact(n))}</span>
        <span class="stat__label">${esc(n.label)}</span>
        <span class="stat__source">Source: ${esc(n.source)}</span>
      </li>`,
    )
    .join('');
  return section('impact', 'Impact', `<ul class="stats">${items}</ul>`, 'By the numbers');
}

const entries = (list: Entry[]) => `<div class="entries">${list.map(entry).join('')}</div>`;

/* ---------- Explainers ---------- */

function pcosExplainer(x: PcosExplainer): string {
  const { w, h, pad } = CHART;
  const rand = rng(11);
  const gauss = () => Math.sqrt(-2 * Math.log(rand() || 1e-9)) * Math.cos(2 * Math.PI * rand());
  // Illustrative cohort: two loose clouds plus a few people in between.
  const cloud = (mx: number, my: number, n: number, cls: string) =>
    Array.from({ length: n }, () => {
      const [cx, cy] = toChart(Math.min(1, Math.max(0, mx + gauss() * 0.1)), Math.min(1, Math.max(0, my + gauss() * 0.1)));
      return `<circle class="pc__dot pc__dot--${cls}" cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="3.5"/>`;
    }).join('');
  const cohort = cloud(0.25, 0.72, 40, 'reproductive') + cloud(0.74, 0.26, 40, 'metabolic') + cloud(0.5, 0.5, 14, 'indeterminate');
  // Bands: reproductive above the line y = x + margin, metabolic below y = x - margin.
  const P = (m: number, r: number) => toChart(m, r).map((n) => n.toFixed(1)).join(' ');
  const repBand = `M${P(0, 0.15)}L${P(0.85, 1)}L${P(0, 1)}Z`;
  const metBand = `M${P(0.15, 0)}L${P(1, 0)}L${P(1, 0.85)}Z`;

  const first = x.examples[0];
  const s0 = scores(x.traits, first.values);
  const [px, py] = toChart(s0.metabolic, s0.reproductive);
  const sub = x.subtypes[s0.subtype];

  const sliders = x.traits
    .map((t) => {
      const v = first.values[t.id];
      return `<label class="pc__slider">
        <span class="pc__slider-head"><span>${esc(t.label)}</span><output data-pc-out="${t.id}">${v}${esc(t.unit)}</output></span>
        <input type="range" min="${t.min}" max="${t.max}" step="1" value="${v}" data-pc-trait="${t.id}" data-unit="${esc(t.unit)}" />
        <span class="pc__axis-tag pc__axis-tag--${t.axis}">${t.axis}</span>
      </label>`;
    })
    .join('');

  return `
    <figure class="explainer explainer--wide" data-pcos>
      <figcaption class="explainer__head">
        <h3 class="explainer__title">${esc(x.title)} ${draftBadge(x)}</h3>
        <p>${esc(x.intro)}</p>
        <p class="explainer__note">${esc(x.note)}</p>
      </figcaption>
      <div class="pc">
        <svg class="pc__svg" viewBox="0 0 ${w} ${h}" role="img" aria-label="Illustrative chart: metabolic traits on the horizontal axis, reproductive hormones on the vertical axis">
          <path class="pc__band pc__band--reproductive" d="${repBand}"/>
          <path class="pc__band pc__band--metabolic" d="${metBand}"/>
          <text class="pc__region pc__region--reproductive" x="${pad + 8}" y="${pad + 18}">${esc(x.subtypes.reproductive.label)}</text>
          <text class="pc__region pc__region--metabolic" x="${w - pad - 8}" y="${h - pad - 10}" text-anchor="end">${esc(x.subtypes.metabolic.label)}</text>
          <line class="pc__axis" x1="${pad}" y1="${h - pad}" x2="${w - pad}" y2="${h - pad}"/>
          <line class="pc__axis" x1="${pad}" y1="${pad}" x2="${pad}" y2="${h - pad}"/>
          <text class="pc__axis-label" x="${w / 2}" y="${h - 10}" text-anchor="middle">Metabolic traits →</text>
          <text class="pc__axis-label" transform="translate(14 ${h / 2}) rotate(-90)" text-anchor="middle">Reproductive hormones →</text>
          ${cohort}
          <g class="pc__patient pc__patient--${s0.subtype}" data-pc-patient style="transform:translate(${px.toFixed(1)}px,${py.toFixed(1)}px)">
            <circle r="11"/><circle class="pc__patient-core" r="4"/>
          </g>
        </svg>
        <div class="pc__controls">
          <div class="pc__examples js-only" role="group" aria-label="Example patients">
            ${x.examples.map((e, i) => `<button type="button" class="step-btn" aria-pressed="${i === 0}" data-pc-example='${esc(JSON.stringify(e.values))}'>${esc(e.label)}</button>`).join('')}
          </div>
          <div class="js-only">${sliders}</div>
          <div class="pc__result pc__result--${s0.subtype}" data-pc-result aria-live="polite">
            <p class="pc__result-label">Subtype: <strong data-pc-label>${esc(sub.label)}</strong></p>
            <p data-pc-text>${esc(sub.text)}</p>
          </div>
        </div>
      </div>
      <dl class="pc__legend">${(['reproductive', 'metabolic', 'indeterminate'] as const)
        .map((k) => `<div><dt><span class="pc__swatch pc__swatch--${k}"></span>${esc(x.subtypes[k].label)}</dt><dd>${esc(x.subtypes[k].text)}</dd></div>`)
        .join('')}</dl>
      <p class="explainer__note">${esc(x.footnote)}</p>
      <script type="application/json" data-pc-config>${JSON.stringify({ traits: x.traits, subtypes: x.subtypes }).replace(/</g, '\\u003c')}</script>
    </figure>`;
}

function gbmExplainer(x: GbmExplainer): string {
  // One graphic, two layers: the canonical pathway along the bottom, and the
  // receptor-correlated gene clusters above the two receptors they belong to.
  // Every mark lists the focus keys it lights up for (n:<gene> or g:<group>).
  const W = 720;
  const H = 465;
  const cols: Record<string, number> = { ligand: 60, messenger: 495, target: 645 };
  const receptorX: Record<string, number> = { TGFBR2: 205, TGFBR1: 345 };
  const pathY = 330;
  const pos = new Map<string, [number, number]>();
  const byGroup = new Map<string, typeof x.nodes>();
  x.nodes.forEach((n) => byGroup.set(n.group, [...(byGroup.get(n.group) ?? []), n]));
  byGroup.forEach((list, g) =>
    list.forEach((n, i) => {
      if (g === 'receptor') pos.set(n.id, [receptorX[n.id] ?? 275, pathY]);
      else pos.set(n.id, [cols[g] ?? 360, pathY + (i - (list.length - 1) / 2) * (g === 'messenger' ? 62 : 80)]);
    }),
  );
  const neighbors = (id: string) => x.links.filter(([a, b]) => a === id || b === id).map(([a, b]) => (a === id ? b : a));
  const groupHub: Record<string, string[]> = { r1: ['TGFBR1'], r2: ['TGFBR2'], shared: ['TGFBR1', 'TGFBR2'] };
  const keys = (...k: string[]) => esc(k.join(' '));

  // Gene clusters.
  const centers: Record<string, [number, number]> = { r2: [140, 120], shared: [275, 105], r1: [410, 120] };
  const counts: Record<string, number> = { r2: 18, shared: 14, r1: 16 };
  const rand = rng(23);
  const clusterLinks: string[] = [];
  const clusterDots: string[] = [];
  for (const g of x.groups) {
    const [cx, cy] = centers[g.id] ?? [275, 110];
    const hubs = groupHub[g.id] ?? [];
    const k = keys(`g:${g.id}`, ...hubs.map((h) => `n:${h}`));
    for (let i = 0; i < (counts[g.id] ?? 12); i++) {
      const a = rand() * Math.PI * 2;
      const r = 12 + rand() * 62;
      const dx = (cx + Math.cos(a) * r).toFixed(1);
      const dy = (cy + Math.sin(a) * r * 0.75).toFixed(1);
      clusterDots.push(`<circle class="gb__gene gb__gene--${g.id}" data-k="${k}" cx="${dx}" cy="${dy}" r="4.5"/>`);
      hubs.forEach((h) => {
        const [hx, hy] = pos.get(h) ?? [0, 0];
        clusterLinks.push(`<line class="gb__corr" data-k="${k}" x1="${hx}" y1="${hy}" x2="${dx}" y2="${dy}"/>`);
      });
    }
  }
  const clusterLabels = x.groups
    .map((g) => {
      const [cx, cy] = centers[g.id] ?? [275, 110];
      return `<text class="gb__cluster-label gb__cluster-label--${g.id}" data-k="${keys(`g:${g.id}`)}" x="${cx}" y="${cy - 66}" text-anchor="middle">${esc(g.label)}</text>`;
    })
    .join('');

  // Pathway.
  const pathLinks = x.links
    .map(([a, b]) => {
      const [x1, y1] = pos.get(a)!;
      const [x2, y2] = pos.get(b)!;
      return `<line class="gb__link" data-k="${keys(`n:${a}`, `n:${b}`)}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
    })
    .join('');
  const pathNodes = x.nodes
    .map((n) => {
      const [cx, cy] = pos.get(n.id)!;
      const big = n.group === 'receptor';
      const groupKeys = big ? Object.entries(groupHub).filter(([, hs]) => hs.includes(n.id)).map(([g]) => `g:${g}`) : [];
      return `<g class="gb__node gb__node--${esc(n.group)}" tabindex="0" role="button" aria-label="${esc(`${n.id}: ${n.role}`)}"
          data-node="${esc(n.id)}" data-role="${esc(n.role)}" data-k="${keys(`n:${n.id}`, ...neighbors(n.id).map((m) => `n:${m}`), ...groupKeys)}">
        <circle cx="${cx}" cy="${cy}" r="${big ? 28 : 14}"/>
        <text x="${cx}" y="${big ? cy + 4 : cy + 29}" text-anchor="middle"${big ? ' class="gb__hub-text"' : ''}>${esc(n.id)}</text>
      </g>`;
    })
    .join('');

  const legend = ['ligand', 'receptor', 'messenger', 'target']
    .map((g) => `<li><span class="gb__swatch gb__node--${g}"></span>${g[0].toUpperCase() + g.slice(1)}s</li>`)
    .join('');

  return `
    <figure class="explainer explainer--wide" data-gbm>
      <figcaption class="explainer__head">
        <p class="section__kicker">${esc(x.lab)}</p>
        <h3 class="explainer__title">${esc(x.title)} ${draftBadge(x)}</h3>
        <p>${esc(x.intro)}</p>
        <p class="explainer__note">${esc(x.note)}</p>
      </figcaption>
      <svg class="gb__svg" viewBox="0 0 ${W} ${H}" aria-label="Illustrative TGF-beta pathway with genes clustered around TGFBR1 and TGFBR2">
        <line class="gb__divider" x1="20" y1="215" x2="${W - 20}" y2="215"/>
        <text class="gb__band-label" x="${W - 20}" y="30" text-anchor="end">Co-expressed genes</text>
        <text class="gb__band-label" x="${W - 20}" y="240" text-anchor="end">Signaling pathway</text>
        ${clusterLinks.join('')}${pathLinks}${clusterDots.join('')}${clusterLabels}${pathNodes}
      </svg>
      <p class="explainer__text gb__out" data-gb-text aria-live="polite">Select a gene or a group to see what it does.</p>
      <div class="gb__groups" role="group" aria-label="Co-expressed gene groups">
        ${x.groups
          .map(
            (g) => `<button type="button" class="gb__group" data-gb-group="${g.id}" aria-pressed="false">
              <span class="gb__group-label"><span class="gb__swatch gb__gene--${g.id}"></span>${esc(g.label)}</span>
              <span class="gb__group-text">${esc(g.text)}</span>
            </button>`,
          )
          .join('')}
      </div>
      <ul class="gb__legend" aria-label="Pathway legend">${legend}</ul>
      <details class="gbm__list"><summary>All pathway genes as a list</summary>
        <dl>${x.nodes.map((n) => `<dt>${esc(n.id)}</dt><dd>${esc(n.role)}</dd>`).join('')}</dl>
      </details>
    </figure>`;
}

function research(r: Resume): string {
  const ex = r.explainers ?? {};
  const extras = [ex.pcos ? pcosExplainer(ex.pcos) : '', ex.glioblastoma ? gbmExplainer(ex.glioblastoma) : ''].join('');
  return section(
    'research',
    'Research',
    `${entries(r.research)}${extras ? `<div class="explainers">${extras}</div>` : ''}`,
    'Science, medicine & history',
  );
}

/* ---------- Reading room ---------- */

function paperCard(p: Paper): string {
  const isSpanish = !!p.abstract.es;
  const original = isSpanish
    ? `<details class="paper__abstract">
        <summary lang="es">Leer el resumen (en español)</summary>
        <p lang="es">${esc(p.abstract.es!)}</p>
        <details class="paper__translation"><summary>English translation</summary><p>${esc(p.abstract.en)}</p></details>
      </details>`
    : `<details class="paper__abstract"><summary>Read the abstract</summary><p>${esc(p.abstract.en)}</p></details>`;
  return `
    <article class="paper" data-tags="${esc(p.tags.join(' '))}">
      <p class="paper__meta"><span>${esc(p.related_org)}</span>${isSpanish ? '<span class="paper__lang">Written in Spanish</span>' : ''}</p>
      <h3 class="paper__title"${isSpanish ? ' lang="es"' : ''}>${esc(p.title)}</h3>
      ${p.title_en ? `<p class="paper__title-en">${esc(p.title_en)}</p>` : ''}
      <p class="paper__status">${esc(p.status)}</p>
      <p class="paper__advisors">Advised by ${p.advisors.map(esc).join('; ')}</p>
      ${original}
    </article>`;
}

function papers(r: Resume): string {
  if (!r.papers?.length) return '';
  return section('papers', 'Reading room', `<div class="papers">${r.papers.map(paperCard).join('')}</div>`, 'Abstracts, in the language they were written');
}

/* ---------- Reach map ---------- */

function reach(r: Resume): string {
  const places = r.places ?? [];
  if (!places.length) return '';
  const home = places.find((p) => p.name === 'New York') ?? places[0];
  const [hx, hy] = project(home.lon, home.lat);
  const arcs = places
    .filter((p) => p.kind === 'studied')
    .map((p) => {
      const [x, y] = project(p.lon, p.lat);
      const mx = (hx + x) / 2;
      const my = Math.min(hy, y) - Math.abs(x - hx) * 0.18 - 20;
      return `<path class="map__arc" data-place="${esc(slug(p.name))}" d="M${hx} ${hy}Q${mx.toFixed(1)} ${my.toFixed(1)} ${x} ${y}" pathLength="1"/>`;
    })
    .join('');
  const pts = places.map((p) => ({ p, xy: project(p.lon, p.lat) }));
  const markers = pts
    .map(({ p, xy: [x, y] }) => {
      // Put the label on the left when another pin sits just to the right, so labels don't collide.
      const crowded = pts.some(({ p: q, xy: [qx, qy] }) => q !== p && qx > x && qx - x < 110 && Math.abs(qy - y) < 16);
      const label = crowded
        ? `<text x="${x - 11}" y="${y + 4}" text-anchor="end">${esc(p.name)}</text>`
        : `<text x="${x + 11}" y="${y + 4}">${esc(p.name)}</text>`;
      return `<g class="map__pin map__pin--${p.kind}" data-place="${esc(slug(p.name))}"><circle cx="${x}" cy="${y}" r="7"/>${label}</g>`;
    })
    .join('');
  const list = (kind: Place['kind'], title: string) => `
    <div class="reach__col">
      <h3 class="reach__h"><span class="map__key map__key--${kind}" aria-hidden="true"></span>${title}</h3>
      <ul class="reach__list">${places
        .filter((p) => p.kind === kind)
        .map((p) => `<li data-place="${esc(slug(p.name))}" tabindex="0"><strong>${esc(p.name)}</strong><span>${p.items.map(esc).join(' · ')}</span></li>`)
        .join('')}</ul>
    </div>`;
  return section(
    'reach',
    'Where the work reaches',
    `<div class="reach">
      <svg class="map" viewBox="0 0 ${MAP.width} ${mapHeight}" role="img" aria-label="Map of places Anish worked and places his research studied. Details in the lists that follow.">
        <path class="map__land" d="${landDotsPath()}"/>
        ${arcs}${markers}
      </svg>
      <div class="reach__lists">${list('worked', 'Worked here')}${list('studied', 'Studied in research')}</div>
    </div>`,
    'Map',
  );
}

/* ---------- Timeline ---------- */

function timeline(r: Resume, lanes: [string, Entry[]][]): string {
  const years = [2022, 2023, 2024, 2025, 2026];
  const first = years[0];
  const lastY = years[years.length - 1];
  const bar = (e: Entry) => {
    const s = Math.max(first, Number(e.start));
    const end = Math.min(lastY, e.end ? Number(e.end) : lastY);
    return `<div class="tl__bar${e.end ? '' : ' tl__bar--ongoing'}" style="grid-column:${s - first + 1} / ${end - first + 2}" data-start="${s}" data-end="${end}" title="${esc(`${e.org}: ${e.role} (${dates(e.start, e.end)})`)}">
      <span>${esc(e.org)}</span>
    </div>`;
  };
  const honorsByYear: Record<string, string[]> = {};
  r.honors.forEach((h) => h.years.forEach((y) => (honorsByYear[y] ??= []).push(h.title)));
  return section(
    'timeline',
    '2022 → 2026',
    `<div class="tl" data-timeline style="--years:${years.length}">
      <div class="tl__scrub js-only">
        <label for="tl-year">Drag through the years</label>
        <input id="tl-year" type="range" min="${first}" max="${lastY}" step="1" value="${lastY}" list="tl-ticks" data-tl-input />
        <output for="tl-year" data-tl-output>${lastY}</output>
      </div>
      <div class="tl__grid">
        <div class="tl__axis" aria-hidden="true"><span></span>${years.map((y) => `<span>${y}</span>`).join('')}</div>
        ${lanes
          .map(
            ([name, list]) => `<div class="tl__lane">
              <h3 class="tl__name">${esc(name)}</h3>
              <div class="tl__track">${list.map(bar).join('')}</div>
            </div>`,
          )
          .join('')}
        <div class="tl__marker js-only" aria-hidden="true" data-tl-marker></div>
      </div>
      <div class="tl__panel js-only" aria-live="polite" data-tl-panel></div>
      <script type="application/json" data-tl-honors>${JSON.stringify(honorsByYear).replace(/</g, '\\u003c')}</script>
    </div>`,
    'Timeline',
  );
}

/* ---------- Honors, languages, contact ---------- */

function honors(r: Resume): string {
  const cats = [...new Set(r.honors.map((h) => h.category))];
  const filters = `<div class="filters js-only" role="group" aria-label="Filter honors by category">
      <button type="button" class="chip chip--button" aria-pressed="true" data-filter="all">All</button>
      ${cats.map((c) => `<button type="button" class="chip chip--button" aria-pressed="false" data-filter="${esc(slug(c))}">${esc(c)}</button>`).join('')}
    </div>`;
  return section('honors', 'Honors & Awards', `${filters}<ul class="honors" data-honors>${r.honors.map(honorItem).join('')}</ul>`);
}

function languages(r: Resume): string {
  const g = r.person.language_greetings ?? [];
  const first = g[0];
  const inner = `
    <div class="greet" data-greet>
      ${first ? `<p class="greet__big" lang="${esc(first.lang)}" aria-live="polite">${esc(first.greeting)}</p>` : ''}
      <ul class="greet__list" role="list">
        ${g
          .map(
            (x, i) => `<li><button type="button" class="greet__btn" aria-pressed="${i === 0}" data-greeting="${esc(x.greeting)}" data-lang="${esc(x.lang)}">
              <span lang="${esc(x.lang)}" class="greet__word">${esc(x.greeting)}</span>
              <span class="greet__name">${esc(x.language)}</span>
            </button></li>`,
          )
          .join('')}
      </ul>
    </div>`;
  return section('languages', 'Languages', inner, `${r.person.languages.length} languages`);
}

function contact(r: Resume): string {
  const p = r.person;
  return section(
    'contact',
    'Get in touch',
    `<p class="contact__lede">${esc(p.looking_for ?? '')}</p>
     <ul class="contact__links">
       <li><a href="mailto:${esc(p.email)}">${esc(p.email)}</a></li>
       <li><a href="${esc(p.links.linkedin)}" rel="noopener" target="_blank">LinkedIn</a></li>
     </ul>`,
  );
}

/* ---------- Quick View (also what @media print outputs) ---------- */

function quickView(r: Resume, groups: { lead: Entry[]; debate: Entry[] }): string {
  const p = r.person;
  const items = (list: Entry[]) =>
    list
      .map(
        (e) => `<div class="qv__item">
          <p><span><strong>${esc(e.org)}</strong>, ${esc(e.role)}</span> <span class="qv__date">${dates(e.start, e.end)}</span></p>
          <ul>${e.bullets.map((b) => `<li>${esc(b)}</li>`).join('')}</ul>
        </div>`,
      )
      .join('');
  const block = (id: string, title: string, inner: string) =>
    inner ? `<div class="qv__block" data-qv="${id}"><h2>${title}</h2>${inner}</div>` : '';
  const byCat = [...new Set(r.honors.map((h) => h.category))]
    .map(
      (c) => `<h3>${esc(c)}</h3><ul>${r.honors
        .filter((h) => h.category === c)
        .map((h) => `<li>${esc(h.title)} (${esc(h.years.join(', '))})</li>`)
        .join('')}</ul>`,
    )
    .join('');
  const paperList = r.papers?.length
    ? `<ul>${r.papers.map((x) => `<li><em${x.abstract.es ? ' lang="es"' : ''}>${esc(x.title)}</em>${x.abstract.es ? ' (in Spanish)' : ''}</li>`).join('')}</ul>`
    : '';
  return `
  <section id="quick-view" class="qv" aria-label="Quick View">
    <div class="qv__inner">
      <p class="qv__back"><a href="#top">← Back to full site</a></p>
      <h1>${esc(p.name)}</h1>
      <p class="qv__contact">${esc(p.location.display)} · <a href="mailto:${esc(p.email)}">${esc(p.email)}</a> · <a href="${esc(p.links.linkedin)}">LinkedIn</a></p>
      <div class="qv__blocks" data-qv-blocks>
        <div class="qv__block" data-qv="education"><h2>Education</h2>
        ${r.education
          .map(
            (e) => `<div class="qv__item"><p><span><strong>${esc(e.school)}</strong>, ${esc(e.location)}</span> <span class="qv__date">${esc(e.display_dates ?? dates(e.start, e.end))}</span></p>
            ${e.degrees ? `<ul><li>${e.degrees.map(esc).join('; ')}</li></ul>` : ''}${e.gpa ? `<ul><li>GPA: ${esc(e.gpa)}</li></ul>` : ''}</div>`,
          )
          .join('')}</div>
        ${block('research', 'Research', items(r.research))}
        ${block('papers', 'Papers', paperList)}
        ${block('service', 'Service', items(r.service))}
        ${block('leadership', 'Leadership', items(groups.lead))}
        ${block('voice', 'Speech & Debate', items(groups.debate))}
        ${block('music', 'Music & Work', items(r.music_and_work))}
        ${block('honors', 'Honors & Awards', byCat)}
        ${block('languages', 'Languages', `<p>${r.person.languages.map(esc).join(', ')}</p>`)}
      </div>
    </div>
  </section>`;
}

/* ---------- Page ---------- */

export function renderHead(r: Resume): string {
  const title = r.person.name;
  const desc = r.person.tagline;
  return `
    <title>${esc(title)}</title>
    <meta name="description" content="${esc(desc)}" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="${esc(title)}" />
    <meta property="og:description" content="${esc(desc)}" />
    <meta name="theme-color" content="#002d72" />`;
}

export function renderBody(r: Resume): string {
  const debate = r.leadership.filter((e) => e.tags.includes('debate'));
  const lead = r.leadership.filter((e) => !e.tags.includes('debate'));
  const debateHonors = r.honors.filter((h) => h.category === 'Speech & Debate');
  const music = r.music_and_work.filter((e) => e.tags.includes('music'));
  const work = r.music_and_work.filter((e) => !e.tags.includes('music'));
  const musicHonors = r.honors.filter((h) => h.tags?.includes('music'));
  const year = new Date().getFullYear();

  const sections: Record<string, string> = {
    impact: impact(r),
    research: research(r),
    papers: papers(r),
    service: section('service', 'Service', entries(r.service), 'Public health & education'),
    reach: reach(r),
    leadership: section('leadership', 'Leadership', entries(lead), 'Student government & clubs'),
    voice: section(
      'voice',
      'Voice',
      withPhoto(`${entries(debate)}<h3 class="sub">Speech & Debate record</h3><ul class="honors">${debateHonors.map(honorItem).join('')}</ul>`, r.media?.voice),
      'Speech & debate',
    ),
    music: section(
      'music',
      'Music',
      withPhoto(
        `${entries(music)}${musicHonors.length ? `<ul class="honors">${musicHonors.map(honorItem).join('')}</ul>` : ''}
       ${work.length ? `<h3 class="sub">Work</h3>${entries(work)}` : ''}`,
        r.media?.music,
      ),
      'Jazz saxophone',
    ),
    timeline: timeline(r, [
      ['Research', r.research],
      ['Service', r.service],
      ['Leadership', lead],
      ['Voice', debate],
      ['Music', music],
    ]),
    honors: honors(r),
    languages: languages(r),
  };
  const order = SECTION_ORDER.filter((id) => sections[id]);

  return `
  <a class="skip-link" href="#main">Skip to content</a>
  <header class="topbar" id="top">
    <div class="topbar__inner">
      <a class="topbar__name" href="#top">${esc(r.person.name)}</a>
      <nav class="topbar__nav" aria-label="Sections">
        <ul data-nav>${[...order, 'contact'].map((id) => `<li data-nav-item="${id}"><a href="#${id}">${SECTION_LABELS[id] ?? 'Contact'}</a></li>`).join('')}</ul>
      </nav>
      <button type="button" class="theme-toggle js-only" data-theme-toggle aria-label="Switch to dark theme">
        <svg class="theme-toggle__moon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11Z"/></svg>
        <svg class="theme-toggle__sun" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.5"/><path d="M12 1.5v3M12 19.5v3M1.5 12h3M19.5 12h3M4.6 4.6l2.1 2.1M17.3 17.3l2.1 2.1M4.6 19.4l2.1-2.1M17.3 6.7l2.1-2.1"/></svg>
      </button>
      <a class="btn btn--small topbar__qv topbar__qv--open" href="#quick-view">Quick View</a>
      <a class="btn btn--small topbar__qv topbar__qv--close" href="#top">Full site</a>
    </div>
  </header>
  <main id="main" class="rich" data-main>
    ${hero(r)}
    ${order.map((id) => sections[id]).join('')}
    ${contact(r)}
  </main>
  ${quickView(r, { lead, debate })}
  <footer class="footer">
    <div class="section__inner">
      <p>© ${year} ${esc(r.person.name)}</p>
      <p><a href="#quick-view">Quick View</a> · <a href="#top">Back to top</a></p>
    </div>
  </footer>`;
}
