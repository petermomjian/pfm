import { useEffect, useRef } from "react";
import { albums } from "@/data/albums";
import { AlbumSleeve, AlbumMeta, SPINE_WIDTH } from "./AlbumCard";

interface AlbumLibraryProps {
  onSelect: (albumId: string) => void;
  onPlay: (albumId: string) => void;
}

const SPACING_VW = 0.15; // spine-to-spine pitch, as a fraction of viewport width
const SLEEVE_TOP_VH = 0.47; // sleeve top edge, as a fraction of viewport height — also the perspective's vertical vanishing point
const SLEEVE_SIZE = 768; // px — square face depth/height, and the perspective scene's height
const GAP_ABOVE_SLEEVE = 54; // px between the metadata block and the sleeve top
const PERSPECTIVE = 1200; // shared stationary camera depth
const MOMENTUM_DECAY = 0.94; // per animation-frame velocity decay once released
const RUBBER_BAND = 0.35; // resistance applied when dragging past the scroll bounds
const CLICK_DRAG_THRESHOLD = 6; // px of pointer movement before a click becomes a drag
const WHEEL_LINE_HEIGHT = 16; // px per "line" when a wheel event reports deltaMode 1

export function AlbumLibrary({ onSelect, onPlay }: AlbumLibraryProps) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const metaTrackRef = useRef<HTMLDivElement | null>(null);

  const spacing = useRef(SLEEVE_SIZE * SPACING_VW);
  const x = useRef(0);
  const velocity = useRef(0);
  const minX = useRef(0);
  const maxX = useRef(0);
  const initialized = useRef(false);
  const dragging = useRef(false);
  const dragStartClientX = useRef(0);
  const dragStartX = useRef(0);
  const dragMoved = useRef(false);
  const lastPointerX = useRef(0);
  const lastPointerTime = useRef(0);

  const clampTarget = (value: number) => Math.min(maxX.current, Math.max(minX.current, value));

  useEffect(() => {
    const measure = () => {
      const viewport = viewportRef.current;
      const track = trackRef.current;
      const metaTrack = metaTrackRef.current;
      if (!viewport || !track || !metaTrack) return;

      const spacingPx = window.innerWidth * SPACING_VW;
      spacing.current = spacingPx;
      const gapPx = spacingPx - SPINE_WIDTH;
      track.style.gap = `${gapPx}px`;
      metaTrack.style.gap = `${gapPx}px`;
      metaTrack.style.setProperty("--slot-width", `${spacingPx}px`);

      const centerX = viewport.clientWidth / 2;
      const lastIndex = albums.length - 1;
      maxX.current = centerX; // spine 0 can reach screen center
      minX.current = centerX - lastIndex * spacingPx; // last spine can reach screen center

      if (!initialized.current) {
        x.current = maxX.current; // open with the first album centered
        initialized.current = true;
      } else {
        x.current = clampTarget(x.current);
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
        if (x.current > maxX.current || x.current < minX.current) {
          const target = x.current > maxX.current ? maxX.current : minX.current;
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
      const metaTrack = metaTrackRef.current;
      const transform = `translateX(${x.current}px)`;
      if (track) track.style.transform = transform;
      if (metaTrack) metaTrack.style.transform = transform;

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
      const scale = e.deltaMode === 1 ? WHEEL_LINE_HEIGHT : e.deltaMode === 2 ? window.innerHeight : 1;
      const delta = (Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY) * scale;
      const atBound = (x.current >= maxX.current && delta < 0) || (x.current <= minX.current && delta > 0);
      x.current += atBound ? -delta * RUBBER_BAND * 0.3 : -delta;
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
    const overshoot = raw > maxX.current ? raw - maxX.current : raw < minX.current ? raw - minX.current : 0;
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

  const handlePlay = (albumId: string) => {
    if (dragMoved.current) return;
    onPlay(albumId);
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
      className="absolute inset-0 cursor-grab overflow-hidden touch-pan-y outline-none active:cursor-grabbing"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerLeave={endDrag}
      onPointerCancel={endDrag}
      onKeyDown={onKeyDown}
    >
      {/* Flat metadata overlay — translates with the row but never rotates or scales. */}
      <div
        ref={metaTrackRef}
        className="absolute left-0 flex w-full will-change-transform"
        style={{ bottom: `calc(${(1 - SLEEVE_TOP_VH) * 100}% + ${GAP_ABOVE_SLEEVE}px)` }}
      >
        {albums.map((album) => (
          <AlbumMeta key={album.id} album={album} onSelect={handleSelect} onPlay={handlePlay} />
        ))}
      </div>

      {/* Stationary perspective scene — only the track inside it translates along X. */}
      <div
        className="absolute left-0 w-full"
        style={{
          top: `${SLEEVE_TOP_VH * 100}%`,
          height: SLEEVE_SIZE,
          perspective: PERSPECTIVE,
          perspectiveOrigin: "50% 0%",
          transformStyle: "preserve-3d",
        }}
      >
        <div
          ref={trackRef}
          className="absolute inset-0 flex items-start will-change-transform"
          style={{ transformStyle: "preserve-3d" }}
        >
          {albums.map((album) => (
            <AlbumSleeve key={album.id} album={album} size={SLEEVE_SIZE} onSelect={handleSelect} />
          ))}
        </div>
      </div>
    </div>
  );
}
