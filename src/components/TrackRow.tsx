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
      className="pfm-interactive group flex items-start gap-4 py-1 text-left text-sm w-full hover:opacity-80 hover:translate-x-1 active:opacity-60"
    >
      <span className={`w-8 shrink-0 ${isActive ? "text-foreground" : "text-muted group-hover:text-foreground"}`}>
        {track.index}
      </span>
      <span className="text-foreground">{track.title}</span>
    </button>
  );
}
