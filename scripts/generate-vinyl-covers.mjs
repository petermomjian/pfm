// Generates a downscaled `cover-vinyl.png` next to every album's `cover.*`,
// used for the vinyl label artwork instead of the full-resolution cover.
// Source covers are typically ~1000px+ square, but the vinyl label only ever
// renders at up to 320px on screen — letting the browser downscale that far
// at paint time (especially while the platter is spinning) produces visible
// moire/aliasing. Pre-resizing once at build time fixes that.
//
// PNG (lossless), not JPEG: the label renders this asset at close to native
// resolution (no further scaling), so any compression artifact is directly
// visible — and JPEG's DCT blocking reads as visible "crunchiness" (ringing)
// around the hard edges of cover text/logos. At 320px square the lossless
// file size cost is negligible.
//
// Runs automatically before `npm run dev` / `npm run build` (see package.json
// "predev"/"prebuild"), and skips albums whose cover-vinyl.png is already
// newer than the source cover. Run directly with:
//   node scripts/generate-vinyl-covers.mjs
import { readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const albumsDir = path.join(__dirname, "..", "src", "assets", "albums");

// Largest on-screen size the vinyl label artwork ever needs (the focused-album
// vinyl's 160px label at up to 2x device pixel ratio), rounded up.
const OUTPUT_SIZE = 320;
const COVER_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];

const folders = readdirSync(albumsDir, { withFileTypes: true }).filter((entry) => entry.isDirectory());

let generated = 0;
let skipped = 0;

for (const folder of folders) {
  const folderPath = path.join(albumsDir, folder.name);
  const files = readdirSync(folderPath);
  const coverFile = files.find(
    (f) => path.parse(f).name.toLowerCase() === "cover" && COVER_EXTENSIONS.includes(path.extname(f).toLowerCase()),
  );
  if (!coverFile) continue;

  const sourcePath = path.join(folderPath, coverFile);
  const outputPath = path.join(folderPath, "cover-vinyl.png");

  const sourceMtime = statSync(sourcePath).mtimeMs;
  const outputMtime = statSync(outputPath, { throwIfNoEntry: false })?.mtimeMs ?? 0;
  if (outputMtime > sourceMtime) {
    skipped++;
    continue;
  }

  await sharp(sourcePath)
    .resize(OUTPUT_SIZE, OUTPUT_SIZE, { fit: "cover" })
    .png({ compressionLevel: 9 })
    .toFile(outputPath);
  console.log(`generated ${path.relative(albumsDir, outputPath)}`);
  generated++;
}

console.log(`vinyl covers: ${generated} generated, ${skipped} up to date`);
