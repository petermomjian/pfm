import { useEffect, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { VinylMark } from "./VinylMark";

// Timings chosen to read as one unbroken move: the record clears the sleeve
// well before the eye can register a seam, then the flight to the player
// takes slightly longer since it covers much more screen distance.
const EXTRACT_MS = 420;
const FLY_MS = 480;
const DEST_SIZE = 512; // matches FocusedAlbum's VinylMark size exactly

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}
function easeOutCubic(t: number) {
  return 1 - (1 - t) ** 3;
}
function clamp01(t: number) {
  return t < 0 ? 0 : t > 1 ? 1 : t;
}

interface Rect {
  left: number;
  top: number;
  width: number;
}

interface VinylExtractionProps {
  sleeveEl: HTMLDivElement;
  faceSize: number;
  destinationRef: RefObject<HTMLDivElement>;
  onComplete: () => void;
}

// Renders the "record slides out of its sleeve, then flies to the player"
// transition described in the Figma storyboard (node 10978:59203). Two
// portals, one continuous timeline:
//
// 1. "extract" — mounted as an actual child of the clicked sleeve's own
//    preserve-3d DOM node, in the same plane as its cover-art face
//    (rotateY(90deg), transform-origin left top). Because it shares that
//    real transformed parent instead of an approximation, it automatically
//    inherits the exact perspective/skew that sleeve has at click time —
//    centered sleeves emerge nearly edge-on, off-center ones broader, same
//    as the sleeve itself would show. The disc slides along the sleeve's
//    own local x-axis (which projects to world depth) so it stays coplanar
//    with the cover while a shrinking opaque shutter — coplanar with the
//    cover, not a clipping ancestor — uncovers it from the spine/opening
//    edge outward. Only once it's fully clear does it counter-rotate back
//    to flat, finishing exactly as phase 2 begins — "coplanar until
//    cleared, then reorient."
// 2. "fly" — once flattened, the disc's screen projection is an honest
//    rectangle (no more perspective to approximate), so it's measured with
//    getBoundingClientRect and handed to a fixed-position portal that tweens
//    that exact box to the destination VinylMark's measured box. Same
//    VinylMark component throughout both phases — no duplicate disc, and
//    nothing here touches PlayerContext/audio.
export function VinylExtraction({ sleeveEl, faceSize, destinationRef, onComplete }: VinylExtractionProps) {
  const [phase, setPhase] = useState<"extract" | "fly">("extract");

  const shutterRef = useRef<HTMLDivElement | null>(null);
  const discPosRef = useRef<HTMLDivElement | null>(null);
  const discRotRef = useRef<HTMLDivElement | null>(null);
  const discMeasureRef = useRef<HTMLDivElement | null>(null);
  const flyRef = useRef<HTMLDivElement | null>(null);
  const flyFromRect = useRef<Rect | null>(null);

  const discDiameter = faceSize * 0.62;
  const restLocalX = faceSize * 0.36;
  const poppedLocalX = -discDiameter * 0.55;

  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  // Phase 1: extraction inside the sleeve's own transformed local space.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      onCompleteRef.current();
      return;
    }

    let rafId = 0;
    let cancelled = false;
    const start = performance.now();

    const bail = () => {
      if (cancelled) return;
      cancelled = true;
      onCompleteRef.current();
    };
    window.addEventListener("resize", bail);

    const step = (now: number) => {
      if (cancelled) return;
      const p = clamp01((now - start) / EXTRACT_MS);

      // The shutter (still coplanar with the sleeve's cover) fully retreats
      // before rotation starts, so the two effects never have to composite
      // together — avoiding the CSS rule that an occluding/clipping
      // property forces transform-style back to flat, which would break
      // the rotateY(90) + rotateY(counterRot) composition below.
      const revealP = easeOutCubic(clamp01(p / 0.55));
      const popP = easeInOutCubic(p);
      const flattenP = easeInOutCubic(clamp01((p - 0.55) / 0.45));

      if (shutterRef.current) shutterRef.current.style.width = `${(1 - revealP) * faceSize}px`;
      if (discPosRef.current) {
        const x = restLocalX + (poppedLocalX - restLocalX) * popP;
        discPosRef.current.style.transform = `translateX(${x}px)`;
      }
      if (discRotRef.current) discRotRef.current.style.transform = `rotateY(${-90 * flattenP}deg)`;

      if (p >= 1) {
        const rect = discMeasureRef.current?.getBoundingClientRect();
        if (!rect || rect.width === 0) {
          bail();
          return;
        }
        flyFromRect.current = { left: rect.left, top: rect.top, width: rect.width };
        cancelled = true; // this effect's loop is done; the fly effect takes over
        setPhase("fly");
        return;
      }
      rafId = requestAnimationFrame(step);
    };

    rafId = requestAnimationFrame(step);
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", bail);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Phase 2: flat 2D FLIP tween from the just-cleared box to the real
  // destination vinyl's measured box.
  useEffect(() => {
    if (phase !== "fly") return;
    const from = flyFromRect.current;
    const dest = destinationRef.current?.getBoundingClientRect();
    if (!from || !dest) {
      onCompleteRef.current();
      return;
    }

    let rafId = 0;
    let cancelled = false;
    const start = performance.now();
    const s0 = from.width / DEST_SIZE;

    const bail = () => {
      if (cancelled) return;
      cancelled = true;
      onCompleteRef.current();
    };
    window.addEventListener("resize", bail);

    const step = (now: number) => {
      if (cancelled) return;
      const p = clamp01((now - start) / FLY_MS);
      const e = easeInOutCubic(p);
      const s = s0 + (1 - s0) * e;
      const x = from.left + (dest.left - from.left) * e;
      const y = from.top + (dest.top - from.top) * e;
      if (flyRef.current) flyRef.current.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${s})`;

      if (p >= 1) {
        bail();
        return;
      }
      rafId = requestAnimationFrame(step);
    };

    rafId = requestAnimationFrame(step);
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", bail);
    };
  }, [phase, destinationRef]);

  if (phase === "extract") {
    return createPortal(
      <div
        aria-hidden
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: faceSize,
          height: faceSize,
          transform: "rotateY(90deg)",
          transformOrigin: "left top",
          backfaceVisibility: "hidden",
          pointerEvents: "none",
          // Required for discRotRef's own rotateY below to compose with
          // this element's rotateY(90) into one true 3D rotation, instead
          // of being flattened to 2D and then re-rotated as a flat sticker.
          transformStyle: "preserve-3d",
        }}
      >
        {/* Rotation must sit OUTSIDE the translate: composing
            rotateY(90) (parent) -> rotateY(counterRot) -> translateX keeps
            the two rotateY transforms adjacent so they add up to a single
            net rotation (90 + counterRot); putting the translate between
            them would rotate the translation axis instead of cancelling
            the parent's rotation. */}
        <div
          ref={discRotRef}
          style={{
            position: "absolute",
            left: 0,
            top: (faceSize - discDiameter) / 2,
            width: discDiameter,
            height: discDiameter,
            transformOrigin: "center center",
          }}
        >
          <div ref={discPosRef} style={{ width: discDiameter, height: discDiameter, transform: `translateX(${restLocalX}px)` }}>
            <div ref={discMeasureRef}>
              <VinylMark size={discDiameter} spinning={false} />
            </div>
          </div>
        </div>

        {/* Occludes the still-"inside" portion by sitting at the same
            coplanar depth as the sleeve's own cover (a real 3D sibling,
            not a clipping ancestor — overflow/clip-path would force this
            whole subtree's transform-style back to flat). Shrinks to 0
            width and is gone before rotation starts, so it never has to
            depth-sort against the disc once the disc stops being coplanar. */}
        <div
          ref={shutterRef}
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: faceSize,
            height: faceSize,
            backgroundColor: "var(--surface)",
            backgroundImage:
              "linear-gradient(to left, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 25%, rgba(0,0,0,0) 75%, rgba(0,0,0,0) 100%)",
          }}
        />
      </div>,
      sleeveEl,
    );
  }

  const from = flyFromRect.current;
  const initialTransform = from
    ? `translate3d(${from.left}px, ${from.top}px, 0) scale(${from.width / DEST_SIZE})`
    : undefined;

  return createPortal(
    <div
      ref={flyRef}
      aria-hidden
      style={{
        position: "fixed",
        left: 0,
        top: 0,
        width: DEST_SIZE,
        height: DEST_SIZE,
        transform: initialTransform,
        transformOrigin: "top left",
        pointerEvents: "none",
        willChange: "transform",
      }}
    >
      <VinylMark size={DEST_SIZE} spinning={false} />
    </div>,
    document.body,
  );
}
