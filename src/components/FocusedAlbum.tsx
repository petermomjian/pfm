import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type RefObject } from "react";
import { ArrowLeft, Pause, Play } from "lucide-react";
import type { Album } from "@/data/albums";
import { usePlayer } from "@/player/PlayerContext";
import { useSettleOnMount } from "@/hooks/useSettleOnMount";
import { PAGE_EXIT_MS, PAGE_ENTER_DELAY_MS, PAGE_ENTER_MS, PAGE_TRANSITION_DISTANCE } from "@/lib/motion";
import { VinylMark } from "./VinylMark";
import { TrackRow } from "./TrackRow";
import { IconSwap } from "./icons/IconSwap";

const MAX_DESKTOP_VINYL_SIZE = 512;
const MIN_DESKTOP_VINYL_SIZE = 240;
const DESKTOP_ROW_GAP = 64; // matches md:gap-16 below
const MOBILE_VINYL_SIZE = 205;

interface BackToLibraryProps {
  album: Album;
  onBack: () => void;
  className?: string;
}

export function BackToLibrary({ album, onBack, className }: BackToLibraryProps) {
  const { track, isPlaying, playTrack, togglePlay } = usePlayer();
  const isThisAlbumActive = Boolean(track && album.tracks.some((t) => t.id === track.id));
  const isThisAlbumPlaying = isThisAlbumActive && isPlaying;

  const handlePlay = () => {
    if (isThisAlbumActive) {
      togglePlay();
      return;
    }
    const firstTrack = album.tracks[0];
    if (firstTrack) playTrack(album.id, firstTrack.id);
  };

  return (
    <div className={`flex items-center gap-4 ${className ?? ""}`}>
      <button
        type="button"
        aria-label="Back to library"
        onClick={onBack}
        className="pfm-interactive flex size-9 shrink-0 -translate-x-3.5 items-center justify-center rounded-full text-foreground hover:bg-[var(--surface)] hover:scale-110 active:bg-transparent active:scale-90 active:opacity-60 focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_rgba(255,255,255,0.3)] max-md:translate-x-0.5"
      >
        <ArrowLeft size={16} />
      </button>
      <div className="flex items-center gap-4 -translate-x-6">
        <button
          type="button"
          aria-label={isThisAlbumPlaying ? `Pause ${album.title}` : `Play ${album.title}`}
          onClick={handlePlay}
          className="pfm-interactive flex size-9 shrink-0 translate-x-2 items-center justify-center rounded-full text-foreground hover:bg-[var(--surface)] hover:scale-110 active:bg-transparent active:scale-90 active:opacity-60 focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_rgba(255,255,255,0.3)]"
        >
          <IconSwap id={isThisAlbumPlaying ? "pause" : "play"} size={16} scale={0.4} blur={10}>
            {isThisAlbumPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
          </IconSwap>
        </button>
        <p className="min-w-0 truncate text-base font-medium">{album.title}</p>
      </div>
    </div>
  );
}

// Measures the row's available height and the info column's intrinsic width
// so the vinyl shrinks to fit a short viewport and never outgrows either the
// content row's height or the horizontal space left beside the tracklist —
// capped at MAX_DESKTOP_VINYL_SIZE so a tall window doesn't blow it up either.
function useDesktopVinylSize(
  rowRef: RefObject<HTMLDivElement | null>,
  infoRef: RefObject<HTMLDivElement | null>,
  enabled: boolean
) {
  const [size, setSize] = useState(MAX_DESKTOP_VINYL_SIZE);

  useLayoutEffect(() => {
    if (!enabled) return;
    const row = rowRef.current;
    const info = infoRef.current;
    if (!row || !info) return;

    const update = () => {
      const availableHeight = row.clientHeight;
      const availableWidth = row.clientWidth - info.getBoundingClientRect().width - DESKTOP_ROW_GAP;
      const next = Math.min(availableHeight, availableWidth, MAX_DESKTOP_VINYL_SIZE);
      setSize(Math.max(MIN_DESKTOP_VINYL_SIZE, next));
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(row);
    observer.observe(info);
    return () => observer.disconnect();
  }, [enabled, rowRef, infoRef]);

  return size;
}

// Tracks whether the tracklist scroll region is away from its top/bottom edge
// so the fade gradients only show on the side that actually hides more list
// content, per the Figma "Track Mask" spec.
function useScrollEdges(scrollRef: RefObject<HTMLDivElement | null>, enabled: boolean) {
  const [edges, setEdges] = useState({ top: false, bottom: false });

  useEffect(() => {
    if (!enabled) return;
    const el = scrollRef.current;
    if (!el) return;

    const update = () => {
      const maxScroll = el.scrollHeight - el.clientHeight;
      setEdges({
        top: el.scrollTop > 1,
        bottom: maxScroll > 1 && el.scrollTop < maxScroll - 1,
      });
    };

    update();
    el.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, [enabled, scrollRef]);

  return edges;
}

interface FocusedAlbumProps {
  album: Album;
  onBack: () => void;
  isMobile: boolean;
  // Set only while this view is mid library<->detail transition (see
  // App.tsx's navTransition state) — "entering" right after the sleeve that
  // opened it, "exiting" right before the sleeve that's reclaiming it. Null
  // once the transition settles, leaving this view at a plain rest state.
  navPhase?: "entering" | "exiting" | null;
}

export function FocusedAlbum({ album, onBack, isMobile, navPhase = null }: FocusedAlbumProps) {
  const { track, isAudioPlaying, playTrack } = usePlayer();
  const isThisAlbumPlaying = track && album.tracks.some((t) => t.id === track.id);

  const rowRef = useRef<HTMLDivElement>(null);
  const infoRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const desktopVinylSize = useDesktopVinylSize(rowRef, infoRef, !isMobile);
  const { top: showTopGradient, bottom: showBottomGradient } = useScrollEdges(scrollRef, !isMobile);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [album.id]);

  // "entering" mounts this view fresh, mid-transition — it must render
  // already slid-down/faded on the very first paint so settling to rest a
  // frame later actually animates (the settle itself happens almost
  // immediately; PAGE_ENTER_DELAY_MS below is what actually holds the
  // visible animation off). "exiting" needs no mount trick: the view is
  // already mounted at rest when Back is pressed, so the prop change alone
  // triggers the transition. Mirrors AlbumLibrary's own sink/rise handling
  // so the two read as one continuous motion, both using the same
  // --ease-page-transition curve: exiting starts immediately, entering
  // waits out a delay rather than running fully concurrently — see
  // PAGE_ENTER_DELAY_MS's doc in lib/motion.ts.
  const navSettled = useSettleOnMount(navPhase === "entering");
  const navAway = navPhase === "exiting" || (navPhase === "entering" && !navSettled);
  const navStyle: CSSProperties = {
    transform: navAway ? `translateY(${PAGE_TRANSITION_DISTANCE}px)` : "translateY(0px)",
    opacity: navAway ? 0 : 1,
    transition:
      navPhase === "exiting"
        ? `transform ${PAGE_EXIT_MS}ms var(--ease-page-transition), opacity ${PAGE_EXIT_MS}ms var(--ease-page-transition)`
        : navPhase === "entering"
          ? `transform ${PAGE_ENTER_MS}ms var(--ease-page-transition) ${PAGE_ENTER_DELAY_MS}ms, opacity ${PAGE_ENTER_MS}ms var(--ease-page-transition) ${PAGE_ENTER_DELAY_MS}ms`
          : undefined,
    // Sits above AlbumLibrary's own default z-index (0) for as long as this
    // view is mounted — Library only ever outranks it briefly, while Back is
    // actively carrying it back on top (see AlbumLibrary's `onTop` prop).
    zIndex: 1,
    // Belt-and-suspenders alongside the z-index: while sliding away this
    // shouldn't intercept clicks meant for the library rising underneath it.
    pointerEvents: navAway ? "none" : "auto",
  };

  return (
    // bg-background: AlbumLibrary is always mounted underneath now (see
    // App.tsx), so this needs its own opaque backdrop — without it the
    // library would show through the transparent space around the vinyl and
    // tracklist for as long as this view is open, not just during the
    // transition's overlap window.
    <div className="absolute inset-0 bg-background" style={navStyle}>
      <div className="pfm-fluid absolute inset-0 flex flex-col items-center overflow-y-auto px-6 pb-48 pt-24 md:overflow-hidden md:px-16 md:py-[calc(var(--pfm-chrome-pad)_+_var(--pfm-chrome-row-h))]">
        <div
          ref={rowRef}
          className="flex w-full flex-col items-center gap-8 md:h-full md:flex-row md:items-center md:justify-center md:gap-16"
        >
          <VinylMark
            size={isMobile ? MOBILE_VINYL_SIZE : desktopVinylSize}
            spinning={Boolean(isThisAlbumPlaying && isAudioPlaying)}
            artworkSrc={album.coverArtVinyl}
            className="shrink-0"
          />
          <div
            ref={infoRef}
            className="flex w-full flex-col items-start justify-center gap-2.5 md:h-full md:w-auto md:min-w-64"
          >
            <div className="hidden shrink-0 items-start pb-4 md:flex">
              <BackToLibrary album={album} onBack={onBack} />
            </div>
            <div className="relative w-full md:min-h-0">
              <div
                ref={scrollRef}
                className="pfm-no-scrollbar flex w-full flex-col items-start pr-1 md:max-h-full md:overflow-y-auto"
              >
                {album.tracks.map((t) => (
                  <TrackRow
                    key={t.id}
                    track={t}
                    isActive={track?.id === t.id}
                    onPlay={() => playTrack(album.id, t.id)}
                  />
                ))}
              </div>
              <div
                className="pfm-interactive pointer-events-none absolute inset-x-0 top-0 hidden h-32 bg-gradient-to-b from-black to-transparent md:block"
                style={{ opacity: showTopGradient ? 1 : 0 }}
              />
              <div
                className="pfm-interactive pointer-events-none absolute inset-x-0 bottom-0 hidden h-32 bg-gradient-to-t from-black to-transparent md:block"
                style={{ opacity: showBottomGradient ? 1 : 0 }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
