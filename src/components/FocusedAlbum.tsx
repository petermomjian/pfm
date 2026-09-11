import { ArrowLeft } from "lucide-react";
import type { Album } from "@/data/albums";
import { usePlayer } from "@/player/PlayerContext";
import { VinylMark } from "./VinylMark";
import { TrackRow } from "./TrackRow";

interface FocusedAlbumProps {
  album: Album;
  onBack: () => void;
}

export function FocusedAlbum({ album, onBack }: FocusedAlbumProps) {
  const { track, isAudioPlaying, playTrack } = usePlayer();
  const isThisAlbumPlaying = track && album.tracks.some((t) => t.id === track.id);

  return (
    <div className="absolute inset-0 flex items-center justify-center gap-16 overflow-hidden pb-16">
      <VinylMark size={512} spinning={Boolean(isThisAlbumPlaying && isAudioPlaying)} />
      <div className="flex flex-col items-start justify-center gap-2.5">
        <div className="flex items-start pb-4">
          <div className="flex items-center gap-4">
            <button
              type="button"
              aria-label="Back to library"
              onClick={onBack}
              className="pfm-interactive flex size-9 -translate-x-3.5 items-center justify-center rounded-full text-foreground hover:bg-[var(--surface)] hover:scale-110 active:bg-transparent active:scale-90 active:opacity-60 focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_rgba(255,255,255,0.3)]"
            >
              <ArrowLeft size={16} />
            </button>
            <p className="text-base font-medium">{album.title}</p>
          </div>
        </div>
        <div className="flex flex-col items-start">
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
