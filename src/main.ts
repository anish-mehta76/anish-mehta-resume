import './styles/tokens.css';
import './styles/base.css';
import './styles/features.css';
import './styles/quickview.css';
import './styles/print.css';
import { scores, toChart } from './pcos';

// Progressive enhancement only: the page is fully pre-rendered without this file.
const root = document.documentElement;
root.classList.add('js');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (!reduceMotion) root.classList.add('motion-ok');

const $ = <T extends Element = HTMLElement>(sel: string, scope: ParentNode = document) => scope.querySelector<T>(sel);
const $$ = <T extends Element = HTMLElement>(sel: string, scope: ParentNode = document) => [...scope.querySelectorAll<T>(sel)];
const press = (all: Element[], on: Element) => all.forEach((b) => b.setAttribute('aria-pressed', String(b === on)));

// Download PDF -> print stylesheet (the Quick View).
$$<HTMLButtonElement>('[data-print]').forEach((b) => b.addEventListener('click', () => window.print()));

/* ---------- Intro language switch ---------- */
const intro = $('[data-intro]');
$$<HTMLButtonElement>('[data-intro-lang]').forEach((btn, _, all) =>
  btn.addEventListener('click', () => {
    if (!intro) return;
    intro.textContent = btn.dataset.introText ?? '';
    intro.lang = btn.dataset.introLang ?? 'en';
    press(all, btn);
  }),
);

/* ---------- Animated impact counters ---------- */
// Counts in the same unit as the final value (k) so it never shows a misleading number like "999+".
function formatCount(value: number, target: number, prefix: string, suffix: string) {
  const body = target >= 1000 ? `${Math.floor(value / 1000)}k` : String(Math.floor(value));
  return `${prefix}${body}${suffix}`;
}
if (!reduceMotion && 'IntersectionObserver' in window) {
  const io = new IntersectionObserver(
    (items) => {
      for (const it of items) {
        if (!it.isIntersecting) continue;
        io.unobserve(it.target);
        const el = it.target as HTMLElement;
        const target = Number(el.dataset.count);
        const { prefix = '', suffix = '' } = el.dataset;
        const final = el.textContent;
        el.setAttribute('aria-label', final ?? '');
        const t0 = performance.now();
        const tick = (t: number) => {
          const p = Math.min(1, (t - t0) / 1400);
          el.textContent = p < 1 ? formatCount(target * (1 - Math.pow(1 - p, 3)), target, prefix, suffix) : final;
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }
    },
    { threshold: 0.6 },
  );
  $$('[data-count]').forEach((c) => io.observe(c));
}

/* ---------- PCOS subtype explainer ---------- */
const pcos = $('[data-pcos]');
if (pcos) {
  const cfg = JSON.parse($('script[data-pc-config]', pcos)?.textContent ?? '{}');
  const inputs = $$<HTMLInputElement>('[data-pc-trait]', pcos);
  const patient = $('[data-pc-patient]', pcos);
  const result = $('[data-pc-result]', pcos);
  const label = $('[data-pc-label]', pcos);
  const text = $('[data-pc-text]', pcos);
  const examples = $$<HTMLButtonElement>('[data-pc-example]', pcos);
  const update = () => {
    const values = Object.fromEntries(inputs.map((i) => [i.dataset.pcTrait!, Number(i.value)]));
    inputs.forEach((i) => {
      const out = $(`[data-pc-out="${i.dataset.pcTrait}"]`, pcos);
      if (out) out.textContent = `${i.value}${i.dataset.unit ?? ''}`;
    });
    const s = scores(cfg.traits, values);
    const [x, y] = toChart(s.metabolic, s.reproductive);
    if (patient) {
      patient.style.transform = `translate(${x}px, ${y}px)`;
      patient.setAttribute('class', `pc__patient pc__patient--${s.subtype}`);
    }
    if (result) result.className = `pc__result pc__result--${s.subtype}`;
    if (label) label.textContent = cfg.subtypes[s.subtype].label;
    if (text) text.textContent = cfg.subtypes[s.subtype].text;
  };
  inputs.forEach((i) =>
    i.addEventListener('input', () => {
      examples.forEach((b) => b.setAttribute('aria-pressed', 'false'));
      update();
    }),
  );
  examples.forEach((b) =>
    b.addEventListener('click', () => {
      const values: Record<string, number> = JSON.parse(b.dataset.pcExample ?? '{}');
      inputs.forEach((i) => (i.value = String(values[i.dataset.pcTrait!] ?? i.value)));
      press(examples, b);
      update();
    }),
  );
}

/* ---------- Glioblastoma: pathway + co-expressed gene groups ---------- */
const gbm = $('[data-gbm]');
if (gbm) {
  const out = $('[data-gb-text]', gbm);
  const marks = $$<SVGElement>('[data-k]', gbm);
  const btns = $$<HTMLButtonElement>('[data-gb-group]', gbm);
  const groupText = new Map(btns.map((b) => [b.dataset.gbGroup!, $('.gb__group-text', b)?.textContent ?? '']));
  const groupLabel = new Map(btns.map((b) => [b.dataset.gbGroup!, $('.gb__group-label', b)?.textContent?.trim() ?? '']));
  const idle = out?.textContent ?? '';
  // key is "n:<gene>" or "g:<group>"; every mark lists the keys it belongs to.
  const focus = (key: string | null) => {
    gbm.classList.toggle('has-focus', !!key);
    marks.forEach((m) => m.classList.toggle('is-near', !!key && (m.dataset.k ?? '').split(' ').includes(key)));
    btns.forEach((b) => b.setAttribute('aria-pressed', String(key === `g:${b.dataset.gbGroup}`)));
    if (!out) return;
    if (!key) out.textContent = idle;
    else if (key.startsWith('g:')) out.textContent = `${groupLabel.get(key.slice(2))}: ${groupText.get(key.slice(2))}`;
    else {
      const node = $<SVGGElement>(`[data-node="${CSS.escape(key.slice(2))}"]`, gbm);
      out.textContent = `${key.slice(2)}: ${node?.dataset.role ?? ''}`;
    }
  };
  $$<SVGGElement>('[data-node]', gbm).forEach((n) => {
    const key = `n:${n.dataset.node}`;
    n.addEventListener('mouseenter', () => focus(key));
    n.addEventListener('focus', () => focus(key));
    n.addEventListener('click', () => focus(key));
    n.addEventListener('keydown', (e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), focus(key)));
  });
  $$<SVGElement>('.gb__gene, .gb__cluster-label', gbm).forEach((m) =>
    m.addEventListener('mouseenter', () => focus((m.dataset.k ?? '').split(' ')[0])),
  );
  btns.forEach((b) => {
    const key = `g:${b.dataset.gbGroup}`;
    b.addEventListener('mouseenter', () => focus(key));
    b.addEventListener('focus', () => focus(key));
    b.addEventListener('click', () => focus(b.getAttribute('aria-pressed') === 'true' ? null : key));
  });
  $('svg', gbm)?.addEventListener('mouseleave', () => focus(null));
  $('.gb__groups', gbm)?.addEventListener('mouseleave', () => focus(null));
}

/* ---------- Timeline scrubber ---------- */
const tl = $('[data-timeline]');
if (tl) {
  const input = $<HTMLInputElement>('[data-tl-input]', tl)!;
  const output = $('[data-tl-output]', tl);
  const panel = $('[data-tl-panel]', tl);
  const marker = $('[data-tl-marker]', tl);
  const honorsByYear: Record<string, string[]> = JSON.parse($('script[data-tl-honors]', tl)?.textContent ?? '{}');
  const bars = $$('.tl__bar', tl);
  const min = Number(input.min);
  const max = Number(input.max);
  const update = () => {
    const y = Number(input.value);
    if (output) output.textContent = String(y);
    tl.style.setProperty('--pos', String((y - min + 0.5) / (max - min + 1)));
    const active = bars.filter((b) => Number(b.dataset.start) <= y && y <= Number(b.dataset.end));
    bars.forEach((b) => b.classList.toggle('is-active', active.includes(b)));
    const lanes = new Set(active.map((b) => b.closest('.tl__lane')?.querySelector('.tl__name')?.textContent));
    const honors = honorsByYear[String(y)] ?? [];
    if (panel) {
      panel.innerHTML = '';
      const h = document.createElement('p');
      h.className = 'tl__summary';
      h.textContent = `${y}: ${active.length} roles across ${lanes.size} threads${honors.length ? `, ${honors.length} honors` : ''}.`;
      panel.append(h);
      if (honors.length) {
        const ul = document.createElement('ul');
        honors.forEach((t) => {
          const li = document.createElement('li');
          li.textContent = t;
          ul.append(li);
        });
        panel.append(ul);
      }
    }
    marker?.removeAttribute('hidden');
  };
  input.addEventListener('input', update);
  update();
}

/* ---------- Reach map: list <-> pin highlighting ---------- */
const reach = $('.reach');
if (reach) {
  const set = (place: string | null) =>
    $$('[data-place]', reach).forEach((el) => el.classList.toggle('is-hot', el.dataset.place === place));
  $$('.reach__list li, .map__pin', reach).forEach((el) => {
    el.addEventListener('mouseenter', () => set((el as HTMLElement).dataset.place ?? null));
    el.addEventListener('focus', () => set((el as HTMLElement).dataset.place ?? null));
    el.addEventListener('mouseleave', () => set(null));
    el.addEventListener('blur', () => set(null));
  });
}

/* ---------- Honors filter ---------- */
const honorList = $('[data-honors]');
$$<HTMLButtonElement>('[data-filter]').forEach((btn, _, all) => {
  btn.addEventListener('click', () => {
    const f = btn.dataset.filter;
    press(all, btn);
    honorList?.querySelectorAll<HTMLElement>('.honor').forEach((h) => {
      h.hidden = f !== 'all' && h.dataset.category !== f;
    });
  });
});

/* ---------- Greeting switcher ---------- */
const greet = $('[data-greet]');
const big = greet && $('.greet__big', greet);
greet &&
  $$<HTMLButtonElement>('.greet__btn', greet).forEach((btn, _, all) => {
    btn.addEventListener('click', () => {
      if (!big) return;
      big.textContent = btn.dataset.greeting ?? '';
      big.lang = btn.dataset.lang ?? '';
      press(all, btn);
    });
  });

/* ---------- Nav highlight + reveal ---------- */
if ('IntersectionObserver' in window) {
  const links = new Map($$<HTMLAnchorElement>('.topbar__nav a').map((a) => [a.hash.slice(1), a]));
  const spy = new IntersectionObserver(
    (items) => {
      for (const it of items) {
        if (!it.isIntersecting) continue;
        links.forEach((a, id) => (id === it.target.id ? a.setAttribute('aria-current', 'true') : a.removeAttribute('aria-current')));
      }
    },
    { rootMargin: '-45% 0px -50% 0px' },
  );
  $$('.rich [data-section]').forEach((s) => spy.observe(s));

  if (!reduceMotion) {
    const rev = new IntersectionObserver(
      (items) => items.forEach((it) => it.isIntersecting && (it.target.classList.add('is-in'), rev.unobserve(it.target))),
      { threshold: 0.1 },
    );
    $$('.rich .entry, .rich .stat, .rich .paper, .map').forEach((el) => {
      el.classList.add('reveal');
      rev.observe(el);
    });
  }
}
