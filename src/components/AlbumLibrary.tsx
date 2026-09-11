import { useEffect, useRef } from "react";
import { albums } from "@/data/albums";
import { AlbumCard } from "./AlbumCard";

interface AlbumLibraryProps {
  onSelect: (albumId: string) => void;
  onPlay: (albumId: string) => void;
}

const EDGE_PADDING = 64; // matches the px-16 inset used by Header / GlobalPlayerBar
const CARD_GAP = 8; // constant gap between panels, independent of their rotation
const PERSPECTIVE = 1600; // shared camera depth for the whole row
const MAX_ANGLE = 80; // degrees a panel reaches at dead center — nearly edge-on, like a record being flipped past
const MAX_Z = 90; // px the center panel is pulled toward the camera
const FALLOFF_CARDS = 1.3; // how many card-widths from center it takes to unwind back to flat
const ANGLE_EASE = 0.28; // per-frame lerp toward the target angle, for a smooth settle
const MOMENTUM_DECAY = 0.94; // per animation-frame velocity decay once released
const RUBBER_BAND = 0.35; // resistance applied when dragging past the scroll bounds
const CLICK_DRAG_THRESHOLD = 6; // px of pointer movement before a click becomes a drag

export function AlbumLibrary({ onSelect, onPlay }: AlbumLibraryProps) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const slotRefs = useRef<(HTMLDivElement | null)[]>([]);
  const coverRefs = useRef<(HTMLDivElement | null)[]>([]);
  const shadeRefs = useRef<(HTMLDivElement | null)[]>([]);
  const cardAngles = useRef<number[]>(albums.map(() => 0));
  const perspectiveOriginY = useRef(0);

  const x = useRef(0);
  const velocity = useRef(0);
  const minX = useRef(0);
  const dragging = useRef(false);
  const dragStartClientX = useRef(0);
  const dragStartX = useRef(0);
  const dragMoved = useRef(false);
  const lastPointerX = useRef(0);
  const lastPointerTime = useRef(0);

  const clampTarget = (value: number) => Math.min(0, Math.max(minX.current, value));

  useEffect(() => {
    const measure = () => {
      const viewport = viewportRef.current;
      const track = trackRef.current;
      if (!viewport || !track) return;
      minX.current = Math.min(0, viewport.clientWidth - track.scrollWidth - EDGE_PADDING);
      x.current = clampTarget(x.current);

      // Align the shared camera's vanishing point with the top edge of the
      // cards so that edge stays level across the row regardless of a
      // panel's rotation — only the bottom recedes, per the Figma reference.
      const slot = slotRefs.current[0];
      if (slot) {
        const originY = slot.getBoundingClientRect().top - viewport.getBoundingClientRect().top;
        perspectiveOriginY.current = originY;
        viewport.style.perspectiveOrigin = `50% ${originY}px`;
      }
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  useEffect(() => {
    let frame: number;
    let lastTime = performance.now();

    const tick = (time: number) => {
      const dt = Math.max(1, Math.min(48, time - lastTime));
      lastTime = time;

      if (!dragging.current) {
        if (x.current > 0 || x.current < minX.current) {
          const target = x.current > 0 ? 0 : minX.current;
          x.current += (target - x.current) * 0.22;
          velocity.current = 0;
        } else {
          x.current += velocity.current * dt;
          velocity.current *= MOMENTUM_DECAY;
          if (Math.abs(velocity.current) < 0.001) velocity.current = 0;
          const clamped = clampTarget(x.current);
          if (clamped !== x.current) {
            x.current = clamped;
            velocity.current = 0;
          }
        }
      }

      const track = trackRef.current;
      const viewport = viewportRef.current;
      if (track) track.style.transform = `translateX(${x.current}px)`;

      if (viewport) {
        const viewportRect = viewport.getBoundingClientRect();
        const viewportCenter = viewportRect.left + viewportRect.width / 2;
        const falloff = FALLOFF_CARDS * (slotRefs.current[0]?.getBoundingClientRect().width || 214);

        slotRefs.current.forEach((slot, i) => {
          const cover = coverRefs.current[i];
          const shade = shadeRefs.current[i];
          if (!slot || !cover) return;
          const rect = slot.getBoundingClientRect();
          const cardCenter = rect.left + rect.width / 2;
          const signedDistance = cardCenter - viewportCenter;
          const target = Math.max(-1, Math.min(1, signedDistance / falloff));

          const current = cardAngles.current[i] + (target - cardAngles.current[i]) * ANGLE_EASE;
          cardAngles.current[i] = current;

          // Panels are nearly edge-on at the center (like a record being
          // flipped past) and unwind toward flat as they recede to either
          // side — the inverse of a typical coverflow. Rotation pivots from
          // the top edge, which (combined with the matched perspective
          // origin) keeps that edge level while only the bottom sweeps.
          const distanceRatio = Math.min(1, Math.abs(current));
          const centeredness = 1 - distanceRatio;
          // Ease the unwind so the crease is sharp right at center and
          // flares out gradually, instead of unwinding at a constant rate.
          const eased = centeredness * centeredness * (3 - 2 * centeredness);
          const direction = current === 0 ? 1 : Math.sign(current);
          const angle = direction * eased * MAX_ANGLE;
          const z = eased * MAX_Z;
          cover.style.transform = `rotateY(${angle}deg) translateZ(${z}px)`;

          // Light rakes down the fold from whichever edge is turned toward
          // the camera; that edge flips with rotation direction, and the
          // grazing angle sharpens (higher contrast) as a panel goes more
          // edge-on, mimicking a rim light rather than a flat dim.
          if (shade) {
            const bright = `rgba(255,255,255,${(0.08 + eased * 0.32).toFixed(3)})`;
            const dark = `rgba(0,0,0,${(0.12 + eased * 0.5).toFixed(3)})`;
            const stops = angle >= 0 ? `${bright}, ${dark}` : `${dark}, ${bright}`;
            shade.style.background = `linear-gradient(90deg, ${stops})`;
          }
        });
      }

      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      const atBound = (x.current >= 0 && delta < 0) || (x.current <= minX.current && delta > 0);
      x.current += atBound ? -delta * RUBBER_BAND * 0.3 : -delta;
      velocity.current = -delta * 0.12;
    };
    viewport.addEventListener("wheel", onWheel, { passive: false });
    return () => viewport.removeEventListener("wheel", onWheel);
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    dragging.current = true;
    dragMoved.current = false;
    dragStartClientX.current = e.clientX;
    dragStartX.current = x.current;
    lastPointerX.current = e.clientX;
    lastPointerTime.current = performance.now();
    velocity.current = 0;
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    const dx = e.clientX - dragStartClientX.current;
    if (Math.abs(dx) > CLICK_DRAG_THRESHOLD) dragMoved.current = true;

    const raw = dragStartX.current + dx;
    const overshoot = raw > 0 ? raw : raw < minX.current ? raw - minX.current : 0;
    x.current = raw - overshoot + overshoot * RUBBER_BAND;

    const now = performance.now();
    const dt = Math.max(1, now - lastPointerTime.current);
    velocity.current = (e.clientX - lastPointerX.current) / dt;
    lastPointerX.current = e.clientX;
    lastPointerTime.current = now;
  };

  const endDrag = () => {
    dragging.current = false;
  };

  const handleSelect = (albumId: string) => {
    if (dragMoved.current) return;
    onSelect(albumId);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") velocity.current = -6;
    else if (e.key === "ArrowLeft") velocity.current = 6;
  };

  return (
    <div
      ref={viewportRef}
      role="group"
      aria-label="Album library, scroll to browse"
      tabIndex={0}
      className="absolute inset-x-0 top-0 bottom-[-277px] cursor-grab overflow-hidden touch-pan-y outline-none active:cursor-grabbing"
      style={{ perspective: PERSPECTIVE }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerLeave={endDrag}
      onPointerCancel={endDrag}
      onKeyDown={onKeyDown}
    >
      <div
        ref={trackRef}
        className="flex h-full items-end will-change-transform"
        style={{ paddingLeft: EDGE_PADDING, gap: CARD_GAP, transformStyle: "preserve-3d" }}
      >
        {albums.map((album, i) => (
          <AlbumCard
            key={album.id}
            album={album}
            onSelect={handleSelect}
            onPlay={onPlay}
            slotRef={(el) => {
              slotRefs.current[i] = el;
            }}
            coverRef={(el) => {
              coverRefs.current[i] = el;
            }}
            shadeRef={(el) => {
              shadeRefs.current[i] = el;
            }}
          />
        ))}
      </div>
    </div>
  );
}
