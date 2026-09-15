import { useEffect, useMemo, useRef, useState } from "react";
import { albums } from "@/data/albums";
import { AlbumSleeve, AlbumMeta, SPINE_WIDTH } from "./AlbumCard";

interface AlbumLibraryProps {
  onSelect: (albumId: string) => void;
  onPlay: (albumId: string) => void;
}

const SPACING_VW = 0.15; // spine-to-spine pitch, as a fraction of viewport width
const SLEEVE_TOP_VH = 0.47; // sleeve top edge, as a fraction of viewport height — also the perspective's vertical vanishing point
const SLEEVE_SIZE = 768; // px — square face depth/height, and the perspective scene's height, at/above DESKTOP_BREAKPOINT
const GAP_ABOVE_SLEEVE = 54; // px between the metadata block and the sleeve top
const PERSPECTIVE = 1200; // shared stationary camera depth, at/above DESKTOP_BREAKPOINT

// Below this viewport width, the sleeve (and perspective depth, to keep the
// same rotation appearance) scale down linearly with viewport width. Every
// sleeve in the loop is mounted simultaneously (see REPEAT_COUNT below), each
// as a full 3D-composited GPU layer at SLEEVE_SIZE^2 — left at a constant
// 768px that's dozens of desktop-scale composited layers on a phone, which
// exceeds iOS Safari/Chrome's (shared WebKit) per-tab GPU memory budget and
// crashes the tab outright. Scaling down shrinks each layer's backing store
// by the square of the scale factor, keeping the same design at a memory
// footprint mobile WebKit can actually hold.
const DESKTOP_BREAKPOINT = 1024;
const MIN_SLEEVE_SIZE = 160;
const MOMENTUM_DECAY = 0.94; // per animation-frame velocity decay once released
const CLICK_DRAG_THRESHOLD = 6; // px of pointer movement before a click becomes a drag
const WHEEL_LINE_HEIGHT = 16; // px per "line" when a wheel event reports deltaMode 1
const WHEEL_VELOCITY_SCALE = 0.0037; // converts a wheel event's px delta into a velocity kick

// The row loops infinitely: the album list is rendered REPEAT_COUNT times back
// to back, and the scroll position silently wraps by one full cycle (the width
// of one album list) whenever it drifts past half a cycle from center. Because
// every copy is identical, the wrap is invisible — with 3 copies there's always
// a full spare cycle of rendered content on either side of the visible window.
const REPEAT_COUNT = 3;

function sleeveSizeForViewport(viewportWidth: number): number {
  if (viewportWidth >= DESKTOP_BREAKPOINT) return SLEEVE_SIZE;
  const scaled = SLEEVE_SIZE * (viewportWidth / DESKTOP_BREAKPOINT);
  return Math.max(MIN_SLEEVE_SIZE, scaled);
}

export function AlbumLibrary({ onSelect, onPlay }: AlbumLibraryProps) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const metaTrackRef = useRef<HTMLDivElement | null>(null);

  // Lazy initializer so the very first paint already uses the correct
  // viewport-scaled size — avoiding a flash at full desktop size (and its
  // GPU memory spike) before the resize effect below can correct it.
  const [sleeveSize, setSleeveSize] = useState(() => sleeveSizeForViewport(window.innerWidth));

  const spacing = useRef(SLEEVE_SIZE * SPACING_VW);
  const x = useRef(0);
  const velocity = useRef(0);
  const baseX = useRef(0); // translateX that centers the middle copy's first spine
  const cycleWidth = useRef(0); // px spanned by one full pass through the album list
  const initialized = useRef(false);
  const dragging = useRef(false);
  const dragStartClientX = useRef(0);
  const dragStartX = useRef(0);
  const dragMoved = useRef(false);
  const lastPointerX = useRef(0);
  const lastPointerTime = useRef(0);

  const repeatedAlbums = useMemo(
    () =>
      Array.from({ length: REPEAT_COUNT }, (_, copy) =>
        albums.map((album) => ({ album, key: `${album.id}-${copy}` }))
      ).flat(),
    []
  );

  useEffect(() => {
    const measure = () => {
      const viewport = viewportRef.current;
      const track = trackRef.current;
      const metaTrack = metaTrackRef.current;
      if (!viewport || !track || !metaTrack) return;

      const oldSpacing = spacing.current;
      const oldBaseX = baseX.current;

      const nextSleeveSize = sleeveSizeForViewport(window.innerWidth);
      setSleeveSize((prev) => (prev === nextSleeveSize ? prev : nextSleeveSize));

      const spacingPx = window.innerWidth * SPACING_VW;
      spacing.current = spacingPx;
      const gapPx = spacingPx - SPINE_WIDTH;
      track.style.gap = `${gapPx}px`;
      metaTrack.style.gap = `${gapPx}px`;
      metaTrack.style.setProperty("--slot-width", `${spacingPx}px`);

      const centerX = viewport.clientWidth / 2;
      const cycle = albums.length * spacingPx;
      const newBaseX = centerX - cycle; // middle copy's spine 0 can reach screen center

      if (!initialized.current) {
        x.current = newBaseX; // open with the first album centered
        initialized.current = true;
      } else if (oldSpacing) {
        // Preserve which album (fractionally) is centered across the resize.
        const albumUnits = (x.current - oldBaseX) / oldSpacing;
        x.current = newBaseX + albumUnits * spacingPx;
      } else {
        x.current = newBaseX;
      }

      cycleWidth.current = cycle;
      baseX.current = newBaseX;
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  useEffect(() => {
    let frame: number;
    let lastTime = performance.now();

    // Keeps x.current within half a cycle of baseX. Since every copy of the
    // album list is identical, shifting by exactly one cycle is imperceptible
    // — this is what makes the row loop seamlessly in both directions.
    const wrap = () => {
      const cycle = cycleWidth.current;
      if (!cycle) return;
      while (x.current - baseX.current > cycle / 2) {
        x.current -= cycle;
        if (dragging.current) dragStartX.current -= cycle;
      }
      while (x.current - baseX.current < -cycle / 2) {
        x.current += cycle;
        if (dragging.current) dragStartX.current += cycle;
      }
    };

    const tick = (time: number) => {
      const dt = Math.max(1, Math.min(48, time - lastTime));
      lastTime = time;

      if (!dragging.current && velocity.current !== 0) {
        x.current += velocity.current * dt;
        velocity.current *= MOMENTUM_DECAY;
        if (Math.abs(velocity.current) < 0.001) velocity.current = 0;
      }

      wrap();

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
      // A kick into the existing momentum system, not a direct position jump —
      // this is what smooths out the harsh per-notch step of a standard mouse
      // wheel into eased motion, matching drag-release momentum.
      velocity.current += -delta * WHEEL_VELOCITY_SCALE;
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

    x.current = dragStartX.current + dx;

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
      className="absolute inset-0 cursor-grab overflow-hidden touch-pan-y outline-none select-none active:cursor-grabbing"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerLeave={endDrag}
      onPointerCancel={endDrag}
      onKeyDown={onKeyDown}
      onDragStart={(e) => e.preventDefault()}
    >
      {/* Flat metadata overlay — translates with the row but never rotates or scales. */}
      <div
        ref={metaTrackRef}
        className="absolute left-0 flex w-full will-change-transform"
        style={{ bottom: `calc(${(1 - SLEEVE_TOP_VH) * 100}% + ${GAP_ABOVE_SLEEVE}px)` }}
      >
        {repeatedAlbums.map(({ album, key }) => (
          <AlbumMeta key={key} album={album} onSelect={handleSelect} onPlay={handlePlay} />
        ))}
      </div>

      {/* Stationary perspective scene — only the track inside it translates along X. */}
      <div
        className="absolute left-0 w-full"
        style={{
          top: `${SLEEVE_TOP_VH * 100}%`,
          height: sleeveSize,
          // Scales with the sleeve so the rotateY faces keep the same apparent
          // depth/foreshortening at every size instead of going flatter as
          // the sleeve shrinks.
          perspective: PERSPECTIVE * (sleeveSize / SLEEVE_SIZE),
          perspectiveOrigin: "50% 0%",
          transformStyle: "preserve-3d",
        }}
      >
        <div
          ref={trackRef}
          className="absolute inset-0 flex items-start will-change-transform"
          style={{ transformStyle: "preserve-3d" }}
        >
          {repeatedAlbums.map(({ album, key }) => (
            <AlbumSleeve key={key} album={album} size={sleeveSize} onSelect={handleSelect} />
          ))}
        </div>
      </div>
    </div>
  );
}
