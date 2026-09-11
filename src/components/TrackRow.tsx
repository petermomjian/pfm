import type { Track } from "@/data/albums";

interface TrackRowProps {
  track: Track;
  isActive: boolean;
  onPlay: () => void;
}

export function TrackRow({ track, isActive, onPlay }: TrackRowProps) {
  return (
    <button
      type="button"
      onClick={onPlay}
      className="pfm-interactive flex items-start gap-4 py-1 text-left text-sm w-full hover:opacity-80 hover:translate-x-1 active:opacity-60"
    >
      <span className="w-8 shrink-0 text-muted">{track.index}</span>
      <span className={isActive ? "text-foreground" : "text-foreground"} style={isActive ? { fontWeight: 500 } : undefined}>
        {track.title}
      </span>
    </button>
  );
}
