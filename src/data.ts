import raw from '../content/resume.json';
import type { Resume } from './types';

const isFlagged = (v: unknown, flag: string) =>
  !!v && typeof v === 'object' && !Array.isArray(v) && (v as Record<string, unknown>)[flag] === true;

// Removes every object marked "private": true (phone, street address) and, unless
// drafts are allowed, every object marked "draft": true. This is the only way content reaches the page.
function clean<T>(node: T, drafts: boolean): T {
  const drop = (v: unknown) => isFlagged(v, 'private') || (!drafts && isFlagged(v, 'draft'));
  if (Array.isArray(node)) return node.filter((n) => !drop(n)).map((n) => clean(n, drafts)) as T;
  if (node && typeof node === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(node)) {
      if (k === '_meta' || drop(v)) continue;
      out[k] = clean(v, drafts);
    }
    return out as T;
  }
  return node;
}

/** Drafts are shown in `npm run dev` (with a DRAFT badge) and left out of production builds. */
export const getSite = (drafts: boolean) => clean(raw, drafts) as unknown as Resume;
