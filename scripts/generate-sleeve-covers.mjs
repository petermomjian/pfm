// Generates a downscaled `cover-sleeve.jpg` next to every album's `cover.*`,
// used for the library carousel's 3D sleeve faces instead of the raw source
// cover. Those faces sit in a continuously animated perspective transform
// (dragging/scrolling the row), and letting the browser downscale a
// full-resolution (1000px+) source at paint time — every frame, at a
// slightly different sub-pixel scale — produces visible shimmer/moire, the
// same issue generate-vinyl-covers.mjs already fixes for the spinning vinyl
// label. Pre-resizing once at build time with a high-quality filter avoids it.
//
// Runs automatically before `npm run dev` / `npm run build` (see package.json
// "predev"/"prebuild"), and skips albums whose cover-sleeve.jpg is already
// newer than the source cover. Run directly with:
//   node scripts/generate-sleeve-covers.mjs
import { readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const albumsDir = path.join(__dirname, "..", "src", "assets", "albums");

// Largest on-screen size a sleeve face ever needs (SLEEVE_SIZE in
// AlbumLibrary.tsx, at up to 2x device pixel ratio), rounded up.
const OUTPUT_SIZE = 1536;
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
  const outputPath = path.join(folderPath, "cover-sleeve.jpg");

  const sourceMtime = statSync(sourcePath).mtimeMs;
  const outputMtime = statSync(outputPath, { throwIfNoEntry: false })?.mtimeMs ?? 0;
  if (outputMtime > sourceMtime) {
    skipped++;
    continue;
  }

  await sharp(sourcePath)
    .resize(OUTPUT_SIZE, OUTPUT_SIZE, { fit: "cover", withoutEnlargement: true })
    // mozjpeg tuning + full chroma resolution: plain baseline JPEG at this
    // quality still rings/blocks visibly around hard edges like cover text
    // and logos — this setting combination is much cleaner at the same
    // file size. Sleeve faces are also seen at an angle/in motion, unlike
    // the vinyl label, so JPEG (not PNG) is still the right tradeoff here.
    .jpeg({ quality: 95, mozjpeg: true, chromaSubsampling: "4:4:4" })
    .toFile(outputPath);
  console.log(`generated ${path.relative(albumsDir, outputPath)}`);
  generated++;
}

console.log(`sleeve covers: ${generated} generated, ${skipped} up to date`);
