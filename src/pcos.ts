// Toy scoring for the illustrative PCOS subtype explainer. Shared by the build
// (pre-rendered default state) and the browser (live sliders). Not a clinical model.
import type { PcosTrait } from './types';

export type Subtype = 'reproductive' | 'metabolic' | 'indeterminate';

export const CHART = { w: 400, h: 300, pad: 36 } as const;
const MARGIN = 0.15;

const norm = (t: PcosTrait, v: number) => Math.min(1, Math.max(0, (v - t.min) / (t.max - t.min)));

export function scores(traits: PcosTrait[], values: Record<string, number>) {
  const avg = (axis: PcosTrait['axis']) => {
    const list = traits.filter((t) => t.axis === axis);
    return list.reduce((s, t) => s + norm(t, values[t.id] ?? t.min), 0) / list.length;
  };
  const metabolic = avg('metabolic');
  const reproductive = avg('reproductive');
  const diff = reproductive - metabolic;
  const subtype: Subtype = diff > MARGIN ? 'reproductive' : diff < -MARGIN ? 'metabolic' : 'indeterminate';
  return { metabolic, reproductive, subtype };
}

/** Chart position: x = metabolic score, y = reproductive score (up is higher). */
export function toChart(metabolic: number, reproductive: number): [number, number] {
  const { w, h, pad } = CHART;
  return [pad + metabolic * (w - 2 * pad), h - pad - reproductive * (h - 2 * pad)];
}
