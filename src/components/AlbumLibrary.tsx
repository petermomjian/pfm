import { useEffect, useRef } from "react";
import { albums } from "@/data/albums";
import { AlbumCard } from "./AlbumCard";

interface AlbumLibraryProps {
  onSelect: (albumId: string) => void;
  onPlay: (albumId: string) => void;
}

const EDGE_PADDING = 64; // matches the px-16 inset used by Header / GlobalPlayerBar
const CARD_GAP = 8; // constant gap between panels, independent of their rotation
const MAX_ANGLE = 52; // degrees a panel reaches once it's fully receded to the side
const FALLOFF_CARDS = 2.6; // how many card-widths from center it takes to reach MAX_ANGLE
const ANGLE_EASE = 0.28; // per-frame lerp toward the target angle, for a smooth settle
const MOMENTUM_DECAY = 0.94; // per animation-frame velocity decay once released
const RUBBER_BAND = 0.35; // resistance applied when dragging past the scroll bounds
const CLICK_DRAG_THRESHOLD = 6; // px of pointer movement before a click becomes a drag

export function AlbumLibrary({ onSelect, onPlay }: AlbumLibraryProps) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const slotRefs = useRef<(HTMLDivElement | null)[]>([]);
  const coverRefs = useRef<(HTMLDivElement | null)[]>([]);
  const cardAngles = useRef<number[]>(albums.map(() => 0));

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
          if (!slot || !cover) return;
          const rect = slot.getBoundingClientRect();
          const cardCenter = rect.left + rect.width / 2;
          const signedDistance = cardCenter - viewportCenter;
          const normalized = Math.max(-1, Math.min(1, signedDistance / falloff));
          const target = normalized * MAX_ANGLE;

          const current = cardAngles.current[i] + (target - cardAngles.current[i]) * ANGLE_EASE;
          cardAngles.current[i] = current;

          const depth = -Math.abs(current) * 2.2;
          const shade = 1 - Math.min(0.4, Math.abs(current) / MAX_ANGLE) * 0.4;
          cover.style.transform = `rotateY(${current}deg) translateZ(${depth}px)`;
          cover.style.filter = `brightness(${shade})`;
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
      style={{ perspective: 2200 }}
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
        style={{ paddingLeft: EDGE_PADDING, gap: CARD_GAP }}
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
          />
        ))}
      </div>
    </div>
  );
}
