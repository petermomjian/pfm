import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { ArrowLeft } from "lucide-react";
import type { Album } from "@/data/albums";
import { usePlayer } from "@/player/PlayerContext";
import { VinylMark } from "./VinylMark";
import { TrackRow } from "./TrackRow";

const MAX_DESKTOP_VINYL_SIZE = 512;
const MIN_DESKTOP_VINYL_SIZE = 240;
const DESKTOP_ROW_GAP = 64; // matches md:gap-16 below
const MOBILE_VINYL_SIZE = 205;

interface BackToLibraryProps {
  title: string;
  onBack: () => void;
  className?: string;
}

export function BackToLibrary({ title, onBack, className }: BackToLibraryProps) {
  return (
    <div className={`flex items-center gap-4 ${className ?? ""}`}>
      <button
        type="button"
        aria-label="Back to library"
        onClick={onBack}
        className="pfm-interactive flex size-9 -translate-x-3.5 items-center justify-center rounded-full text-foreground hover:bg-[var(--surface)] hover:scale-110 active:bg-transparent active:scale-90 active:opacity-60 focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_rgba(255,255,255,0.3)] max-md:translate-x-0.5"
      >
        <ArrowLeft size={16} />
      </button>
      <p className="text-base font-medium">{title}</p>
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
}

export function FocusedAlbum({ album, onBack, isMobile }: FocusedAlbumProps) {
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

  return (
    <div className="pfm-fluid absolute inset-0 flex flex-col items-center overflow-y-auto px-6 pb-48 pt-24 md:overflow-hidden md:px-0 md:py-[calc(var(--pfm-chrome-pad)_+_var(--pfm-chrome-row-h))]">
      <div
        ref={rowRef}
        className="flex w-full flex-col items-center gap-8 md:h-full md:flex-row md:items-center md:justify-center md:gap-16"
      >
        <VinylMark
          size={isMobile ? MOBILE_VINYL_SIZE : desktopVinylSize}
          spinning={Boolean(isThisAlbumPlaying && isAudioPlaying)}
          className="shrink-0"
        />
        <div
          ref={infoRef}
          className="flex w-full flex-col items-start justify-center gap-2.5 md:h-full md:w-auto"
        >
          <div className="hidden shrink-0 items-start pb-4 md:flex">
            <BackToLibrary title={album.title} onBack={onBack} />
          </div>
          <div className="relative w-full md:min-h-0">
            <div
              ref={scrollRef}
              className="pfm-no-scrollbar flex w-full flex-col items-start md:max-h-full md:overflow-y-auto"
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
  );
}
