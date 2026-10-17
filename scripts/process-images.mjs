// Turns the original photos in images/ (gitignored: they carry EXIF and GPS data)
// into small, metadata-free WebP files in public/media/. Run with `npm run images`
// after adding or changing a photo. HEIC input needs macOS `sips`.
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';

const OUT = 'public/media';
mkdirSync(OUT, { recursive: true });

// crop: region in the upright (EXIF-rotated) original. widths: output sizes.
const jobs = [
  { src: 'images/IMG_8446.heic', name: 'headshot', crop: { left: 120, top: 720, width: 960, height: 1200 }, widths: [320, 640, 960], quality: 86, sharpen: true },
  { src: 'images/IMG_0353.JPEG', name: 'saxophone', crop: { left: 1100, top: 300, width: 1730, height: 2400 }, widths: [480, 960] },
  { src: 'images/IMG_7743.JPEG', name: 'debate-trophy', crop: { left: 626, top: 900, width: 1800, height: 2400 }, widths: [480, 960] },
  { src: 'images/jhu_shield.jpg', name: 'jhu-shield', crop: { left: 95, top: 25, width: 260, height: 260 }, widths: [96] },
];

const tmp = mkdtempSync(join(tmpdir(), 'resume-img-'));

for (const job of jobs) {
  let input = job.src;
  if (/\.heic$/i.test(input)) {
    input = join(tmp, `${job.name}.jpg`);
    execFileSync('sips', ['-s', 'format', 'jpeg', job.src, '--out', input], { stdio: 'ignore' });
  }
  for (const w of job.widths) {
    const file = join(OUT, `${job.name}-${w}.webp`);
    // sharp drops all metadata (EXIF, GPS, ICC) unless asked to keep it.
    let img = sharp(input).rotate().extract(job.crop).resize({ width: w });
    if (job.sharpen) img = img.sharpen({ sigma: 0.6 });
    const info = await img.webp({ quality: job.quality ?? 78 }).toFile(file);
    console.log(`${file}  ${info.width}x${info.height}  ${(info.size / 1024).toFixed(0)} KB`);
  }
}
