// Build-time only (imported from render.ts via vite.config.ts): turns the
// Natural Earth land outline into a dotted map, so no map code ships to visitors.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { geoContains } from 'd3-geo';
import { feature } from 'topojson-client';
import type { Topology } from 'topojson-specification';

export const MAP = { west: -130, east: 95, north: 62, south: -38, width: 900 } as const;
const STEP = 2; // degrees between dots

export const mapHeight = Math.round((MAP.width * (MAP.north - MAP.south)) / (MAP.east - MAP.west));

export function project(lon: number, lat: number): [number, number] {
  const x = ((lon - MAP.west) / (MAP.east - MAP.west)) * MAP.width;
  const y = ((MAP.north - lat) / (MAP.north - MAP.south)) * mapHeight;
  return [Math.round(x * 10) / 10, Math.round(y * 10) / 10];
}

let cached: string | null = null;

/** One SVG path of small squares, one per land grid cell. */
export function landDotsPath(): string {
  if (cached) return cached;
  const require = createRequire(import.meta.url);
  const topo = JSON.parse(readFileSync(require.resolve('world-atlas/land-110m.json'), 'utf8')) as Topology;
  const land = feature(topo, topo.objects.land);
  const size = 3;
  const parts: string[] = [];
  for (let lat = MAP.north; lat >= MAP.south; lat -= STEP) {
    for (let lon = MAP.west; lon <= MAP.east; lon += STEP) {
      if (geoContains(land as any, [lon, lat])) {
        const [x, y] = project(lon, lat);
        parts.push(`M${x - size / 2} ${y - size / 2}h${size}v${size}h-${size}z`);
      }
    }
  }
  cached = parts.join('');
  return cached;
}
