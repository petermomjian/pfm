interface VinylMarkProps {
  size: number;
  spinning?: boolean;
  flat?: boolean;
  artworkSrc?: string;
  className?: string;
}

const ASSET_BASE = "/vinyl";
const BASE_SIZE = 512;
const ROTATION_SECONDS = 1.8; // 33 RPM

// Plain placeholder disc shown when there's no track loaded — the detailed
// Figma vinyl implies a record is actually on the platter, so an idle player
// falls back to this flat mark instead.
function FlatVinylMark({ size, className }: { size: number; className?: string }) {
  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: "9999px",
        backgroundColor: "var(--surface)",
        position: "relative",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          margin: "auto",
          width: size * 0.4,
          height: size * 0.4,
          borderRadius: "9999px",
          backgroundColor: "rgba(10, 10, 10, 0.5)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          margin: "auto",
          width: size * 0.05,
          height: size * 0.05,
          borderRadius: "9999px",
          backgroundColor: "var(--surface-strong)",
        }}
      />
    </div>
  );
}

// Matches the Figma "Vinyl Detail" component (node 10971:56109) 1:1: layer
// order, dimensions, masks, opacity, and blend modes are reproduced exactly.
// Only the "Rotate" group (Vinyl Texture + Artwork) spins; everything else —
// Background, Surface, Ridges, and the two exclusion Highlights — is static.
// The whole 512px composition is rendered at native scale and resized via a
// single CSS transform so proportions stay exact at any requested `size`.
export function VinylMark({
  size,
  spinning = false,
  flat = false,
  artworkSrc = `${ASSET_BASE}/cover-placeholder.png`,
  className,
}: VinylMarkProps) {
  const scale = size / BASE_SIZE;

  if (flat) {
    return <FlatVinylMark size={size} className={className} />;
  }

  return (
    <div className={className} style={{ width: size, height: size, position: "relative", flexShrink: 0 }}>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: BASE_SIZE,
          height: BASE_SIZE,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      >
        <div className="absolute left-0 top-0 size-[512px]">
          <img alt="" className="absolute inset-0 block size-full max-w-none" src={`${ASSET_BASE}/background.svg`} />
        </div>
        <div className="absolute left-[11px] top-[11px] size-[490px]">
          <img alt="" className="absolute inset-0 block size-full max-w-none" src={`${ASSET_BASE}/surface.svg`} />
        </div>
        <div className="absolute left-[26px] top-[26px] size-[460px]">
          <img alt="" className="absolute inset-0 block size-full max-w-none" src={`${ASSET_BASE}/ridge-1.svg`} />
        </div>
        <div className="absolute left-[48px] top-[48px] size-[416px]">
          <img alt="" className="absolute inset-0 block size-full max-w-none" src={`${ASSET_BASE}/ridge-2.svg`} />
        </div>
        <div className="absolute left-[76px] top-[76px] size-[360px]">
          <img alt="" className="absolute inset-0 block size-full max-w-none" src={`${ASSET_BASE}/ridge-3.svg`} />
        </div>
        <div className="absolute left-[96px] top-[96px] size-[320px]">
          <img alt="" className="absolute inset-0 block size-full max-w-none" src={`${ASSET_BASE}/ridge-4.svg`} />
        </div>
        <div className="absolute left-[120px] top-[120px] size-[272px]">
          <img alt="" className="absolute inset-0 block size-full max-w-none" src={`${ASSET_BASE}/ridge-5.svg`} />
        </div>

        <div className="absolute left-[11px] top-[11px] size-[490px] mix-blend-exclusion">
          <div className="relative size-[490px]">
            <div className="absolute inset-[48.37%_48.37%_5.07%_-1.59%]">
              <img alt="" className="block size-full max-w-none" src={`${ASSET_BASE}/highlight-tl.png`} />
            </div>
          </div>
        </div>
        <div className="absolute left-[11px] top-[11px] size-[490px] mix-blend-exclusion">
          <div className="relative size-[490px]">
            <div className="absolute inset-[5.07%_-1.59%_48.37%_48.37%]">
              <img alt="" className="block size-full max-w-none" src={`${ASSET_BASE}/highlight-br.png`} />
            </div>
          </div>
        </div>

        {/* "Rotate" group: a stationary, non-transformed wrapper so the two
            spinning children below stay direct siblings of the static
            layers above. Each blend-mode layer's own transform must live on
            the SAME element as its mix-blend-mode — a transformed ancestor
            would create a new stacking context and cut the blend off from
            the Background/Surface/Ridges/Highlights it needs to see. The
            spinning circle is a perfect incircle of its square source image,
            so rotating only the image (not its clipped/bordered container)
            is pixel-identical at every angle while keeping the border
            un-blended, exactly as authored in Figma. */}
        <div className="absolute left-[11px] top-[11px] size-[490px]">
          <div className="absolute left-0 top-0 size-[490px] overflow-clip rounded-[99999px] border border-[var(--surface)]">
            <img
              alt=""
              className="pointer-events-none absolute inset-0 size-full max-w-none object-cover mix-blend-overlay"
              style={{
                animation: `vinyl-spin ${ROTATION_SECONDS}s linear infinite`,
                animationPlayState: spinning ? "running" : "paused",
              }}
              src={`${ASSET_BASE}/texture.png`}
            />
          </div>
          <div
            className="absolute left-[165px] top-[165px] size-[160px] overflow-clip rounded-[999px]"
            style={{
              animation: `vinyl-spin ${ROTATION_SECONDS}s linear infinite`,
              animationPlayState: spinning ? "running" : "paused",
            }}
          >
            <img alt="" className="absolute inset-0 size-full max-w-none object-cover" src={artworkSrc} />
            <div className="absolute inset-0 rounded-[inherit] shadow-[inset_0px_2px_4px_0px_rgba(255,255,255,0.25),inset_0px_-2px_4px_0px_rgba(0,0,0,0.25)]" />
          </div>
        </div>

        <div className="absolute left-[232px] top-[232px] size-[48px]">
          <img alt="" className="absolute inset-0 block size-full max-w-none" src={`${ASSET_BASE}/highlight-spindle.svg`} />
        </div>
        <div className="absolute left-[248px] top-[248px] size-[16px]">
          <div className="absolute inset-[-6.25%]">
            <img alt="" className="block size-full max-w-none" src={`${ASSET_BASE}/highlight-dot.svg`} />
          </div>
        </div>
      </div>
    </div>
  );
}
