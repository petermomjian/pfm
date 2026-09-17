// Extracts a single representative color from an image's outer border ring —
// used to tint UI elements (e.g. the album sleeve spine) so they blend with
// the artwork instead of a fixed neutral fill. The image's own center/detail
// area is deliberately excluded from sampling.

const SAMPLE_SIZE = 32; // downscale target — plenty for one averaged swatch, cheap to read back
const EDGE_RING_FRACTION = 0.14; // fraction of the sampled square treated as "outer edge" on each side
const BUCKET_STEP = 24; // quantization step per channel when binning similar colors together

const promiseCache = new Map<string, Promise<string>>();
const resolvedCache = new Map<string, string>();

function toHex(r: number, g: number, b: number): string {
  const channel = (v: number) => Math.round(v).toString(16).padStart(2, "0");
  return `#${channel(r)}${channel(g)}${channel(b)}`;
}

async function computeEdgeColor(src: string): Promise<string> {
  const response = await fetch(src);
  if (!response.ok) throw new Error(`Failed to fetch ${src}: ${response.status}`);
  const blob = await response.blob();

  // Resizing during decode (rather than decoding at full resolution and
  // downscaling after) is what keeps this cheap for large source artwork —
  // the browser's decoder can skip most of the original pixel data.
  const bitmap = await createImageBitmap(blob, {
    resizeWidth: SAMPLE_SIZE,
    resizeHeight: SAMPLE_SIZE,
    resizeQuality: "low",
  });

  const canvas = document.createElement("canvas");
  canvas.width = SAMPLE_SIZE;
  canvas.height = SAMPLE_SIZE;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("2D canvas context unavailable");

  // Stretched to a small square rather than aspect-fit — sampling only cares
  // about the color along each edge, not preserving the source's proportions.
  ctx.drawImage(bitmap, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
  bitmap.close();
  const { data } = ctx.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE);

  const ringWidth = Math.max(1, Math.round(SAMPLE_SIZE * EDGE_RING_FRACTION));
  const buckets = new Map<string, { r: number; g: number; b: number; count: number }>();

  for (let y = 0; y < SAMPLE_SIZE; y++) {
    const onYEdge = y < ringWidth || y >= SAMPLE_SIZE - ringWidth;
    for (let x = 0; x < SAMPLE_SIZE; x++) {
      const onEdge = onYEdge || x < ringWidth || x >= SAMPLE_SIZE - ringWidth;
      if (!onEdge) continue;

      const i = (y * SAMPLE_SIZE + x) * 4;
      if (data[i + 3] < 200) continue; // skip transparent border pixels

      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const key = `${Math.round(r / BUCKET_STEP)},${Math.round(g / BUCKET_STEP)},${Math.round(b / BUCKET_STEP)}`;

      const bucket = buckets.get(key);
      if (bucket) {
        bucket.r += r;
        bucket.g += g;
        bucket.b += b;
        bucket.count += 1;
      } else {
        buckets.set(key, { r, g, b, count: 1 });
      }
    }
  }

  let dominant: { r: number; g: number; b: number; count: number } | null = null;
  for (const bucket of buckets.values()) {
    if (!dominant || bucket.count > dominant.count) dominant = bucket;
  }
  if (!dominant) throw new Error("No sampled edge pixels");

  return toHex(dominant.r / dominant.count, dominant.g / dominant.count, dominant.b / dominant.count);
}

/** Already-resolved edge color for `src`, if any — lets callers avoid an initial fallback flash. */
export function getCachedEdgeColor(src: string): string | undefined {
  return resolvedCache.get(src);
}

/**
 * Dominant color of an image's outer border ring, memoized per source URL so
 * repeat calls (re-renders, multiple sleeves sharing an album) reuse the same
 * decode + sample pass instead of redoing the work.
 */
export function getEdgeColor(src: string): Promise<string> {
  let pending = promiseCache.get(src);
  if (!pending) {
    pending = computeEdgeColor(src).then((color) => {
      resolvedCache.set(src, color);
      return color;
    });
    promiseCache.set(src, pending);
    // Don't let a failed attempt get stuck cached as a permanently-rejected
    // promise — evict it so a later call can retry.
    pending.catch(() => promiseCache.delete(src));
  }
  return pending;
}
