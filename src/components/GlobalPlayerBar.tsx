import { Pause, Play, SkipBack, SkipForward, Volume2 } from "lucide-react";
import { usePlayer } from "@/player/PlayerContext";
import { Slider } from "./Slider";
import { VinylMark } from "./VinylMark";

export function GlobalPlayerBar() {
  const { track, isPlaying, volume, togglePlay, next, prev, setVolume } = usePlayer();

  return (
    <div className="flex w-full items-center justify-between pointer-events-auto">
      <div className="flex flex-1 min-w-0 items-center gap-4">
        <button
          type="button"
          aria-label="Volume"
          className="flex size-8 shrink-0 items-center justify-center rounded-full text-foreground"
        >
          <Volume2 size={16} />
        </button>
        <Slider value={volume} max={1} onChange={setVolume} width={128} aria-label="Volume" />
      </div>

      <div className="flex flex-1 items-center justify-center">
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Previous track"
            onClick={prev}
            disabled={!track}
            className="flex size-20 items-center justify-center rounded-full text-foreground transition-colors duration-150 hover:bg-[var(--surface)] active:bg-transparent active:opacity-60 focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_rgba(255,255,255,0.3)] disabled:pointer-events-none disabled:opacity-30"
          >
            <SkipBack size={24} />
          </button>
          <button
            type="button"
            aria-label={isPlaying ? "Pause" : "Play"}
            onClick={togglePlay}
            disabled={!track}
            className="flex size-20 items-center justify-center rounded-full border border-[var(--border-input)] transition-colors duration-150 hover:bg-[var(--surface)] active:bg-transparent active:opacity-60 focus-visible:outline-none focus-visible:border-[var(--surface-border)] focus-visible:shadow-[0_0_0_3px_rgba(255,255,255,0.3)] disabled:pointer-events-none disabled:opacity-30"
          >
            {isPlaying ? <Pause size={24} /> : <Play size={24} />}
          </button>
          <button
            type="button"
            aria-label="Next track"
            onClick={next}
            disabled={!track}
            className="flex size-20 items-center justify-center rounded-full text-foreground transition-colors duration-150 hover:bg-[var(--surface)] active:bg-transparent active:opacity-60 focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_rgba(255,255,255,0.3)] disabled:pointer-events-none disabled:opacity-30"
          >
            <SkipForward size={24} />
          </button>
        </div>
      </div>

      <div className="flex flex-1 min-w-0 items-center justify-end gap-4">
        <div className="flex flex-col items-start gap-0.5 text-sm w-28 min-w-0">
          <span className="text-muted">Now Playing</span>
          <span className="truncate w-full">{track ? track.title : "—"}</span>
        </div>
        <VinylMark size={80} spinning={isPlaying} />
      </div>
    </div>
  );
}
