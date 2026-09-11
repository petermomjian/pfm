import { useEffect, useRef } from "react";

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
const FULL_SPEED_DEG_PER_MS = 360 / (ROTATION_SECONDS * 1000);
const SPIN_TRANSITION_MS = 600; // medium-length spin-up/spin-down

const easeInCubic = (t: number) => t * t * t;
const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;

type SpinPhase = "idle" | "accelerating" | "steady" | "decelerating";

// Drives the platter's rotation with a real angular velocity instead of
// toggling a linear CSS animation's play state, so starting playback eases
// the spin up to speed and stopping eases it down to a halt rather than
// snapping instantly.
function useVinylRotation(spinning: boolean) {
  const textureRef = useRef<HTMLImageElement | null>(null);
  const artworkRef = useRef<HTMLDivElement | null>(null);
  const angleRef = useRef(0);
  const velocityRef = useRef(0); // deg/ms
  const phaseRef = useRef<SpinPhase>("idle");
  const phaseStartRef = useRef(0);
  const phaseStartVelocityRef = useRef(0);

  // Retargets the phase whenever playback state changes; the actual stepping
  // happens in the persistent loop below, which keeps running the whole time
  // this component is mounted.
  useEffect(() => {
    phaseStartVelocityRef.current = velocityRef.current;
    phaseStartRef.current = performance.now();

    if (spinning) {
      phaseRef.current = "accelerating";
    } else if (velocityRef.current > 0 || phaseRef.current !== "idle") {
      phaseRef.current = "decelerating";
    } else {
      phaseRef.current = "idle";
    }
  }, [spinning]);

  // A single rAF loop for the component's lifetime — avoids coordinating
  // start/stop across renders (and the StrictMode double-invoke pitfall of
  // an id ref left stale after a simulated mount/cleanup/remount).
  useEffect(() => {
    let rafId: number;
    let lastFrame: number | null = null;

    function step(frameTime: number) {
      const last = lastFrame ?? frameTime;
      const dt = Math.min(frameTime - last, 50);
      lastFrame = frameTime;

      const phase = phaseRef.current;
      const elapsed = frameTime - phaseStartRef.current;

      if (phase === "accelerating") {
        if (elapsed >= SPIN_TRANSITION_MS) {
          velocityRef.current = FULL_SPEED_DEG_PER_MS;
          phaseRef.current = "steady";
        } else {
          velocityRef.current = FULL_SPEED_DEG_PER_MS * easeInCubic(elapsed / SPIN_TRANSITION_MS);
        }
      } else if (phase === "decelerating") {
        if (elapsed >= SPIN_TRANSITION_MS) {
          velocityRef.current = 0;
          phaseRef.current = "idle";
        } else {
          velocityRef.current =
            phaseStartVelocityRef.current * (1 - easeOutCubic(elapsed / SPIN_TRANSITION_MS));
        }
      }

      if (velocityRef.current !== 0) {
        angleRef.current = (angleRef.current + velocityRef.current * dt) % 360;
        const transform = `rotate(${angleRef.current}deg)`;
        if (textureRef.current) textureRef.current.style.transform = transform;
        if (artworkRef.current) artworkRef.current.style.transform = transform;
      }

      rafId = requestAnimationFrame(step);
    }

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, []);

  return { textureRef, artworkRef };
}

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
  const { textureRef, artworkRef } = useVinylRotation(spinning);

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
              ref={textureRef}
              alt=""
              className="pointer-events-none absolute inset-0 size-full max-w-none object-cover mix-blend-overlay"
              src={`${ASSET_BASE}/texture.png`}
            />
          </div>
          <div
            ref={artworkRef}
            className="absolute left-[165px] top-[165px] size-[160px] overflow-clip rounded-[999px]"
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
