import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { albums } from "@/data/albums";
import { PAGE_EXIT_MS, PAGE_ENTER_DELAY_MS, PAGE_ENTER_MS, LIBRARY_SINK_DISTANCE, LIBRARY_SINK_DEPTH } from "@/lib/motion";
import { AlbumSleeve, AlbumMeta, SPINE_WIDTH } from "./AlbumCard";

interface AlbumLibraryProps {
  onSelect: (albumId: string) => void;
  onPlay: (albumId: string) => void;
  // True for the detail view's entire open duration (not just mid-transition)
  // — see App.tsx's `view` state. The whole library page (metadata row +
  // sleeve carousel, as one unit) slides down and fades out while this is
  // true, revealing the detail view sliding up over it. AlbumLibrary is
  // always mounted now (never unmounted while the detail view is open) so
  // this can just be an ordinary prop-driven style instead of needing a
  // remount-triggered one, which is also what keeps the carousel's scroll
  // position and loaded cover art intact across a round trip into the
  // detail view and back.
  sunk?: boolean;
  // Which way the transition is actively running right now — only
  // meaningful while it's actually in flight; ignored the rest of the time
  // since nothing is changing to animate. "in" (accelerate away) while a
  // click is carrying the library away, "out" (decelerate into place)
  // while Back is carrying it back into view.
  navEase?: "in" | "out";
  // True only for the brief window Back is actively carrying the library
  // back on top of the still-exiting detail view (see App.tsx's
  // navTransition direction) — momentarily elevates it above the detail
  // view so it visibly slides up *over* it, matching "putting the vinyl
  // back into the sleeve." False the rest of the time, leaving the detail
  // view on top — needed since AlbumLibrary is always mounted, even while
  // fully hidden behind the detail view for its whole open duration.
  onTop?: boolean;
}

const SPACING_VW = 0.15; // spine-to-spine pitch, as a fraction of viewport width
const SLEEVE_TOP_VH = 0.47; // sleeve top edge, as a fraction of viewport height — also the perspective's vertical vanishing point
const SLEEVE_SIZE = 768; // px — square face depth/height, and the perspective scene's height, at/above DESKTOP_BREAKPOINT
const GAP_ABOVE_SLEEVE = 54; // px between the metadata block and the sleeve top
const PERSPECTIVE = 1200; // shared stationary camera depth, at/above DESKTOP_BREAKPOINT

// Keeps the metadata block clear of the header on short/cramped viewports,
// where SLEEVE_TOP_VH's percentage-of-height positioning would otherwise let
// the row drift up underneath it. Below this, the row is pinned to a minimum
// px offset instead of the usual percentage.
const MIN_CLEARANCE_ABOVE_HEADER = 96; // px, required clear space above the metadata block's top edge
// Header chrome dimensions — kept in sync with index.css's --pfm-chrome-pad /
// --pfm-chrome-row-h (desktop) and Header.tsx's mobile Logo height (h-6).
const CHROME_BREAKPOINT = 768; // px, Tailwind's `md` — matches Header's own layout switch
const HEADER_PAD = 36;
const HEADER_ROW_H = 80;
const MOBILE_HEADER_H = 24;

function headerBottomForViewport(viewportWidth: number): number {
  return viewportWidth >= CHROME_BREAKPOINT ? HEADER_PAD + HEADER_ROW_H : HEADER_PAD + MOBILE_HEADER_H;
}

// Rough estimate of the metadata block's rendered height, used only until the
// real measurement (which accounts for title/artist text wrapping) lands on
// mount — keeps the very first paint from flashing at an unclamped position.
const META_CONTENT_HEIGHT_ESTIMATE = 130;

function sleeveTopForViewport(viewportWidth: number, viewportHeight: number, metaContentHeight: number): number {
  const minSleeveTop = headerBottomForViewport(viewportWidth) + MIN_CLEARANCE_ABOVE_HEADER + metaContentHeight + GAP_ABOVE_SLEEVE;
  return Math.max(viewportHeight * SLEEVE_TOP_VH, minSleeveTop);
}

// Below this viewport width, the sleeve (and perspective depth, to keep the
// same rotation appearance) scale down linearly with viewport width. Every
// sleeve in the loop is mounted simultaneously (see REPEAT_COUNT below), each
// as a full 3D-composited GPU layer at SLEEVE_SIZE^2 — left at a constant
// 768px that's dozens of desktop-scale composited layers on a phone, which
// exceeds iOS Safari/Chrome's (shared WebKit) per-tab GPU memory budget and
// crashes the tab outright. Scaling down shrinks each layer's backing store
// by the square of the scale factor, keeping the same design at a memory
// footprint mobile WebKit can actually hold.
//
// That scaling — and the matching spine-to-spine spacing scaling below —
// bottoms out at CHROME_BREAKPOINT (this app's mobile/desktop split, shared
// with useIsMobile): below it, sleeve size and spacing are pinned to their
// value at that width instead of continuing to shrink with the viewport, and
// the viewport clips the now-oversized row instead. This does narrow the GPU
// memory margin on phones (sleeves stay ~576px there instead of shrinking
// further) — worth a real-device check if crashes reappear.
const DESKTOP_BREAKPOINT = 1024;
const MOMENTUM_DECAY = 0.94; // per animation-frame velocity decay once released
const CLICK_DRAG_THRESHOLD = 6; // px of pointer movement before a click becomes a drag
const WHEEL_LINE_HEIGHT = 16; // px per "line" when a wheel event reports deltaMode 1
const WHEEL_VELOCITY_SCALE = 0.0037; // converts a wheel event's px delta into a velocity kick
// Width, in fractions of one spine-to-spine slot, of the guard band around a
// sleeve's own vanishing-point crossing where both cover faces are forced
// paintable — see the backface-visibility comment in the tick loop below.
// SPINE_WIDTH is tiny next to the scene's PERSPECTIVE/SLEEVE_SIZE, so the
// actual dead zone this papers over is a sliver of a slot; this is sized
// with generous headroom around it rather than tuned to its exact width.
const CROSSOVER_GUARD_BAND = 0.05;

// The row loops infinitely: the album list is rendered REPEAT_COUNT times back
// to back, and the scroll position silently wraps by one full cycle (the width
// of one album list) whenever it drifts past half a cycle from center. Because
// every copy is identical, the wrap is invisible — with 3 copies there's always
// a full spare cycle of rendered content on either side of the visible window.
const REPEAT_COUNT = 3;

// How many sleeves on either side of the currently-centered one keep their
// full 3D geometry (see AlbumSleeve's `full` prop). Every sleeve in the loop
// is mounted at once regardless of this window — it only decides which ones
// also get their two image-textured cover layers, the actual GPU memory
// cost. Sleeves this far from center are already heavily foreshortened
// toward edge-on in the shared perspective, so losing their cover layers
// isn't visible; this just caps how many full-resolution texture layers can
// be resident at once. Mobile WebKit's per-tab GPU budget makes this a hard
// requirement there (see DESKTOP_BREAKPOINT above); desktop GPUs have far
// more headroom, so its radius is generous enough that the cap is normally
// never felt, but still bounds worst-case memory use on low-end laptops
// instead of leaving all REPEAT_COUNT * albums.length sleeves resident.
const MOBILE_ACTIVE_WINDOW_RADIUS = 6;
const DESKTOP_ACTIVE_WINDOW_RADIUS = 12;

function activeWindowRadiusForViewport(viewportWidth: number): number {
  return viewportWidth < CHROME_BREAKPOINT ? MOBILE_ACTIVE_WINDOW_RADIUS : DESKTOP_ACTIVE_WINDOW_RADIUS;
}

// Floors the width used for size/spacing scaling at CHROME_BREAKPOINT, so
// below that (mobile) the row stops shrinking and the viewport clips it
// instead — see the comment above CHROME_BREAKPOINT's declaration.
function scalingWidth(viewportWidth: number): number {
  return Math.max(viewportWidth, CHROME_BREAKPOINT);
}

function sleeveSizeForViewport(viewportWidth: number): number {
  const width = scalingWidth(viewportWidth);
  if (width >= DESKTOP_BREAKPOINT) return SLEEVE_SIZE;
  return SLEEVE_SIZE * (width / DESKTOP_BREAKPOINT);
}

export function AlbumLibrary({
  onSelect,
  onPlay,
  sunk = false,
  navEase = "out",
  onTop = false,
}: AlbumLibraryProps) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const metaTrackRef = useRef<HTMLDivElement | null>(null);
  const metaContentRef = useRef<HTMLDivElement | null>(null); // first item only, used to measure real metadata block height

  // Key of the repeated-album item whose title/play button is hovered — the
  // matching sleeve (same key, in the separate perspective track) lifts.
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  // Lazy initializer so the very first paint already uses the correct
  // viewport-scaled size — avoiding a flash at full desktop size (and its
  // GPU memory spike) before the resize effect below can correct it.
  const [sleeveSize, setSleeveSize] = useState(() => sleeveSizeForViewport(window.innerWidth));
  // Sleeve top edge, in px from the viewport top. Usually SLEEVE_TOP_VH of
  // viewport height, but floored to keep MIN_CLEARANCE_ABOVE_HEADER of clear
  // space above the metadata block on short/cramped viewports.
  const [sleeveTop, setSleeveTop] = useState(() =>
    sleeveTopForViewport(window.innerWidth, window.innerHeight, META_CONTENT_HEIGHT_ESTIMATE)
  );

  const repeatedCount = REPEAT_COUNT * albums.length;
  // Index (into repeatedAlbums) of the sleeve that gets full geometry ± the
  // viewport-appropriate radius — see activeWindowRadiusForViewport().
  // Initialized to match where x.current itself initializes below (the
  // middle copy's first album, centered on first paint).
  const [activeRange, setActiveRange] = useState(() => {
    const center = albums.length;
    const radius = activeWindowRadiusForViewport(window.innerWidth);
    return {
      start: Math.max(0, center - radius),
      end: Math.min(repeatedCount - 1, center + radius),
    };
  });
  // -1 (not a valid repeatedAlbums index) so the first tick's change check
  // always fires — otherwise, whenever the real starting center happens to
  // equal this ref's initial value, the first-paint z-index assignment
  // below (see tick()) would simply never run.
  const lastCenterIndex = useRef(-1);

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

  // The tick loop below only keeps requesting frames while something is
  // actually moving (drag in progress or momentum still decaying) — see its
  // shouldContinue check. Anything that sets velocity/dragging from outside
  // that loop (pointer down, wheel, arrow keys, a resize nudging x.current)
  // needs to kick it awake again if it had gone idle; this ref holds the
  // loop's own restart function once the effect below defines it.
  const wakeLoop = useRef<() => void>(() => {});

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

      const spacingPx = scalingWidth(window.innerWidth) * SPACING_VW;
      spacing.current = spacingPx;
      const gapPx = spacingPx - SPINE_WIDTH;
      track.style.gap = `${gapPx}px`;
      metaTrack.style.gap = `${gapPx}px`;
      metaTrack.style.setProperty("--slot-width", `${spacingPx}px`);
      // Also exposed on the sleeve track (inherited by each AlbumSleeve) so a
      // sleeve can clip its own rendered content to its lane — see the
      // clipPath comment in AlbumCard.tsx.
      track.style.setProperty("--slot-width", `${spacingPx}px`);

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

      const metaContentHeight = metaContentRef.current?.getBoundingClientRect().height ?? META_CONTENT_HEIGHT_ESTIMATE;
      const nextSleeveTop = sleeveTopForViewport(window.innerWidth, window.innerHeight, metaContentHeight);
      setSleeveTop((prev) => (prev === nextSleeveTop ? prev : nextSleeveTop));

      // Re-derive the active window immediately on resize too (not just on
      // scroll, via tick()'s lastCenterIndex check below) — otherwise
      // crossing CHROME_BREAKPOINT without also scrolling would leave the
      // previous viewport's radius in effect until the next scroll-driven
      // center change.
      if (lastCenterIndex.current >= 0) {
        const center = lastCenterIndex.current;
        const radius = activeWindowRadiusForViewport(window.innerWidth);
        setActiveRange({
          start: Math.max(0, center - radius),
          end: Math.min(repeatedCount - 1, center + radius),
        });
      }

      // x.current may have just moved (see the resize-preservation branch
      // above) while the tick loop was idle — nudge it awake so the new
      // position actually reaches the DOM instead of waiting for the next
      // drag/momentum to happen to touch it.
      wakeLoop.current();
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  useEffect(() => {
    let frame: number | null = null;
    let lastTime = performance.now();

    // Last zIndex actually written to each sleeve, so the per-frame pass
    // below (see its own comment) can skip re-writing a style property that
    // hasn't changed instead of touching all `repeatedCount` elements' style
    // every frame regardless — most frames only shift rank right at the one
    // or two sleeves nearest an index boundary. -1 never matches a real
    // z-index, so every element's first frame still writes once.
    const lastZIndex = new Int32Array(repeatedCount).fill(-1);

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

      // Recompute which sleeve is nearest the centered position every frame
      // (see the z-index comment below for why this can't be throttled to
      // only when the integer index changes), and separately gate the
      // mobile-only React state update to when that integer actually
      // changes (roughly once per sleeve-width of scroll).
      const viewport = viewportRef.current;
      if (viewport && spacing.current) {
        const raw = (viewport.clientWidth / 2 - x.current) / spacing.current;
        const center = Math.max(0, Math.min(repeatedCount - 1, Math.round(raw)));

        if (center !== lastCenterIndex.current) {
          lastCenterIndex.current = center;

          // Widen/shift the window of sleeves mounted at full geometry — see
          // activeWindowRadiusForViewport().
          const radius = activeWindowRadiusForViewport(window.innerWidth);
          setActiveRange({
            start: Math.max(0, center - radius),
            end: Math.min(repeatedCount - 1, center + radius),
          });
        }

        // Each sleeve is its own preserve-3d group, so nothing here gives
        // Chromium a true, unified 3D sort between different sleeves' own
        // geometry — only within one sleeve's own faces (spine, covers,
        // etc.), which back-face visibility already handles. Between
        // sleeves it falls back to DOM/paint order, which only happens to
        // match correct occlusion (nearer beats farther) for sleeves left
        // of the shared vanishing point, where a receding cover reaches
        // toward *later* DOM siblings. Right of it, a receding cover
        // reaches toward *earlier* siblings instead, so paint order runs
        // backward from occlusion there — a farther sleeve's cover can
        // paint over a nearer neighbor's own spine/cover, reading as
        // artwork bleeding past that neighbor's edge. Explicit z-index,
        // ranked purely by distance from the centered sleeve (independent
        // of scroll direction, unlike DOM order), makes whichever sleeve is
        // more central — and so genuinely nearer the camera at any point
        // where two sleeves' geometry overlaps — win on both sides.
        //
        // Written every frame, not just when `center` changes: overlap
        // extent between two given sleeves keeps shifting as x.current
        // moves even while the nearest integer index stays put, so an
        // update throttled to integer-index changes leaves z-index stale
        // — matching the *previous* center — for most of the scroll
        // between one change and the next. That stale ranking still picks
        // the right winner in the vast majority of frames (rankings only
        // flip right at an index boundary), but for the frames where it's
        // wrong, a farther sleeve can briefly out-rank a nearer one and
        // paint over it — visible as a hairline flash of the wrong
        // sleeve's edge at the exact moment two sleeves' geometry crosses.
        // Iterates the live children collection directly (no Array.from
        // copy) and skips the zIndex write when the rank hasn't changed
        // since last frame — most sleeves' rank relative to a fixed center
        // only actually flips right at an index boundary, so most frames
        // only touch the one or two elements crossing one.
        const sleeveTrack = trackRef.current;
        if (sleeveTrack) {
          const children = sleeveTrack.children;
          for (let i = 0; i < children.length; i++) {
            const el = children[i] as HTMLElement;
            const z = repeatedCount - Math.abs(i - center);
            if (lastZIndex[i] !== z) {
              lastZIndex[i] = z;
              el.style.zIndex = String(z);
            }

            // The front/back cover pair (see AlbumSleeve) are two parallel
            // planes SPINE_WIDTH apart with opposite outward normals, each
            // independently backface-culled by the browser based on this
            // sleeve's position relative to the shared vanishing point.
            // Because they're offset from each other rather than coincident,
            // their two culling thresholds don't land on the exact same
            // scroll position — there's a hairline gap between "front has
            // rotated past face-on" and "back has rotated into face-on"
            // where the browser culls both at once and the cover briefly
            // shows nothing but the surface behind it. Only the sleeve
            // currently crossing the vanishing point (raw within one slot of
            // its own index) can ever be in that gap, so for just that one,
            // force both faces paintable and let Chromium's real 3D sort
            // (accurate within one sleeve's own preserve-3d group, unlike
            // the cross-sleeve case above) pick whichever is actually
            // nearer instead of trusting each face's own culling in
            // isolation.
            if (el.children.length > 4) {
              const back = el.children[el.children.length - 2] as HTMLElement;
              const front = el.children[el.children.length - 1] as HTMLElement;
              const bv = Math.abs(raw - i) < CROSSOVER_GUARD_BAND ? "visible" : "hidden";
              if (back.style.backfaceVisibility !== bv) back.style.backfaceVisibility = bv;
              if (front.style.backfaceVisibility !== bv) front.style.backfaceVisibility = bv;
            }
          }
        }
      }

      const track = trackRef.current;
      const metaTrack = metaTrackRef.current;
      // Rounded to a whole pixel before it ever reaches the DOM. Every
      // sleeve's rotation is an illusion of this shared perspective's fixed
      // vanishing point acting on that sleeve's position — never its own
      // (constant) transform — so the sub-pixel remainder x.current
      // accumulates every frame was reaching the 3D scene too, nudging each
      // sleeve's front/back cover pair (see AlbumSleeve) fractionally back
      // and forth across the crossover where Chromium decides which of the
      // pair is front-facing. That's what read as flicker along the far
      // edge/back cover near the vanishing point — not true z-fighting, but
      // the crossover re-deciding itself every frame on a value that never
      // needed sub-pixel precision to look smooth.
      // translate3d, not translateX: this track lives inside the shared
      // preserve-3d scene, and an explicit 3D transform function is what
      // actually keeps a per-frame update like this one on the compositor
      // thread as a pure layer-matrix change — a 2D transform function here
      // gives the browser room to treat it as a plain layout-adjacent style
      // write instead, inviting a main-thread repaint of the 3D subtree on
      // every frame instead of just re-positioning the already-rasterized
      // sleeve layers.
      const transform = `translate3d(${Math.round(x.current)}px, 0, 0)`;
      if (track) track.style.transform = transform;
      if (metaTrack) metaTrack.style.transform = transform;

      // Nothing left to animate — drop out of the rAF loop instead of
      // spending a frame's worth of main-thread time (this tick, plus the
      // z-index rewrite over every sleeve above) 60 times a second while the
      // carousel just sits there. Idling forever unconditionally was stealing
      // scheduling headroom from native scrolling elsewhere in the app (the
      // tracklist, page scroll) even when this screen wasn't being touched.
      // wakeLoop (below) restarts it the moment something moves again.
      if (dragging.current || velocity.current !== 0) {
        frame = requestAnimationFrame(tick);
      } else {
        frame = null;
      }
    };

    wakeLoop.current = () => {
      if (frame != null) return;
      lastTime = performance.now();
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => {
      if (frame != null) cancelAnimationFrame(frame);
    };
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
      wakeLoop.current();
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
    wakeLoop.current();
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
    else return;
    wakeLoop.current();
  };

  // The whole library page's own slide/fade against the detail view — see
  // this component's `sunk`/`navEase`/`onTop` prop docs above. Exiting
  // starts immediately (this is the transition's own starting point);
  // entering waits out a delay so the two don't run fully concurrently —
  // see PAGE_ENTER_DELAY_MS's doc in lib/motion.ts for why.
  //
  // Split across two different transforms rather than one shared wrapper:
  // a second, independent `perspective` stacked on top of the sleeve
  // scene's own (see the scene div below) warps its geometry — every sleeve
  // read as visibly bowed even at rest, since the two perspectives'
  // differing origins compound instead of composing cleanly. So the sink
  // only ever happens *inside* the scene's own existing perspective (the
  // sinkStyle wrapper nested inside it, just below) — the same "translateY
  // within the shared preserve-3d scene" philosophy the sleeve hover-lift
  // already uses, just applied to the whole row via one extra wrapper
  // instead of to each sleeve individually. The flat metadata row (never
  // rotated or scaled even at rest — see its own comment below) only needs
  // a plain 2D translateY to match, no perspective involved.
  //
  // Opacity/z-index/pointer-events live once on the outer root instead of
  // duplicated on both inner transforms, since both move as one unit.
  const navTransition =
    navEase === "in"
      ? `${PAGE_EXIT_MS}ms var(--ease-page-transition)`
      : `${PAGE_ENTER_MS}ms var(--ease-page-transition) ${PAGE_ENTER_DELAY_MS}ms`;
  const rootStyle: CSSProperties = {
    opacity: sunk ? 0 : 1,
    transition: `opacity ${navTransition}`,
    zIndex: onTop ? 2 : 0,
    pointerEvents: sunk && !onTop ? "none" : "auto",
  };
  const flatSinkStyle: CSSProperties = {
    transform: sunk ? `translateY(${LIBRARY_SINK_DISTANCE}px)` : "translateY(0px)",
    transition: `transform ${navTransition}`,
  };
  // Genuine translateZ, not just translateY — this is what makes the sink a
  // real move through the scene's existing perspective (the same shared 3D
  // space the sleeve hover-lift's own translateY already lives in) instead
  // of a flat 2D slide. Receding in Z under a perspective projection
  // naturally shrinks an object's apparent size (moving away from the
  // camera), which read as an unwanted scale-down here — so it's paired
  // with a compensating scale, computed from this same scene's own
  // effective perspective value, that exactly cancels the projection's
  // shrink factor. Net effect: the row genuinely moves back in Z (real 3D
  // movement) while staying visually the same size throughout.
  const effectivePerspective = PERSPECTIVE * (sleeveSize / SLEEVE_SIZE);
  const sinkCompensateScale = (effectivePerspective + LIBRARY_SINK_DEPTH) / effectivePerspective;
  const scene3dSinkStyle: CSSProperties = {
    transformStyle: "preserve-3d",
    transform: sunk
      ? `translateY(${LIBRARY_SINK_DISTANCE}px) translateZ(-${LIBRARY_SINK_DEPTH}px) scale(${sinkCompensateScale})`
      : "translateY(0px) translateZ(0px) scale(1)",
    transition: `transform ${navTransition}`,
  };

  return (
    <div
      ref={viewportRef}
      role="group"
      aria-label="Album library, scroll to browse"
      tabIndex={0}
      className="absolute inset-0 cursor-grab overflow-hidden touch-pan-y outline-none select-none active:cursor-grabbing"
      style={rootStyle}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerLeave={endDrag}
      onPointerCancel={endDrag}
      onKeyDown={onKeyDown}
      onDragStart={(e) => e.preventDefault()}
    >
      {/* Flat metadata overlay — translates with the row but never rotates or scales. */}
      <div className="absolute inset-0" style={flatSinkStyle}>
        <div
          ref={metaTrackRef}
          className="absolute left-0 flex w-full will-change-transform"
          style={{ bottom: `calc(100% - ${sleeveTop - GAP_ABOVE_SLEEVE}px)` }}
        >
          {repeatedAlbums.map(({ album, key }, index) => (
            <AlbumMeta
              key={key}
              album={album}
              onSelect={handleSelect}
              onPlay={handlePlay}
              contentRef={index === 0 ? metaContentRef : undefined}
              onHoverChange={(hovering) => setHoveredKey(hovering ? key : null)}
            />
          ))}
        </div>
      </div>

      {/* Stationary perspective scene — unchanged from before this
          transition existed. Only the track inside it translates along X;
          the new sink wrapper nested just inside it (scene3dSinkStyle)
          shares this exact perspective rather than introducing a second,
          conflicting one. */}
      <div
        className="absolute left-0 w-full"
        style={{
          top: `${sleeveTop}px`,
          height: sleeveSize,
          // Scales with the sleeve so the rotateY faces keep the same apparent
          // depth/foreshortening at every size instead of going flatter as
          // the sleeve shrinks.
          perspective: PERSPECTIVE * (sleeveSize / SLEEVE_SIZE),
          perspectiveOrigin: "50% 0%",
          transformStyle: "preserve-3d",
        }}
      >
        <div className="absolute inset-0" style={scene3dSinkStyle}>
          <div
            ref={trackRef}
            className="absolute inset-0 flex items-start will-change-transform"
            style={{ transformStyle: "preserve-3d" }}
          >
            {repeatedAlbums.map(({ album, key }, index) => (
              <AlbumSleeve
                key={key}
                album={album}
                size={sleeveSize}
                onSelect={handleSelect}
                raised={key === hoveredKey}
                full={index >= activeRange.start && index <= activeRange.end}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
