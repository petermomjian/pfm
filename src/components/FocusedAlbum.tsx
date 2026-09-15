import { ArrowLeft } from "lucide-react";
import type { Album } from "@/data/albums";
import { usePlayer } from "@/player/PlayerContext";
import { VinylMark } from "./VinylMark";
import { TrackRow } from "./TrackRow";

const DESKTOP_VINYL_SIZE = 512;
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
        className="pfm-interactive flex size-9 -translate-x-3.5 items-center justify-center rounded-full text-foreground hover:bg-[var(--surface)] hover:scale-110 active:bg-transparent active:scale-90 active:opacity-60 focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_rgba(255,255,255,0.3)]"
      >
        <ArrowLeft size={16} />
      </button>
      <p className="text-base font-medium">{title}</p>
    </div>
  );
}

interface FocusedAlbumProps {
  album: Album;
  onBack: () => void;
  isMobile: boolean;
}

export function FocusedAlbum({ album, onBack, isMobile }: FocusedAlbumProps) {
  const { track, isAudioPlaying, playTrack } = usePlayer();
  const isThisAlbumPlaying = track && album.tracks.some((t) => t.id === track.id);

  return (
    <div className="pfm-fluid absolute inset-0 flex flex-col items-center gap-8 overflow-y-auto px-6 pb-48 pt-24 md:flex-row md:justify-center md:gap-16 md:overflow-hidden md:px-0 md:pb-16 md:pt-0">
      <VinylMark
        size={isMobile ? MOBILE_VINYL_SIZE : DESKTOP_VINYL_SIZE}
        spinning={Boolean(isThisAlbumPlaying && isAudioPlaying)}
        className="shrink-0"
      />
      <div className="flex w-full flex-col items-start justify-center gap-2.5 md:w-auto">
        <div className="hidden items-start pb-4 md:flex">
          <BackToLibrary title={album.title} onBack={onBack} />
        </div>
        <div className="flex w-full flex-col items-start">
          {album.tracks.map((t) => (
            <TrackRow
              key={t.id}
              track={t}
              isActive={track?.id === t.id}
              onPlay={() => playTrack(album.id, t.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
