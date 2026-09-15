import { usePlayer } from "@/player/PlayerContext";
import { SeekBar } from "./SeekBar";
import { Slider } from "./Slider";
import { IconSwap } from "./icons/IconSwap";
import { PauseIcon, PlayIcon, SkipBackIcon, SkipForwardIcon } from "./icons/TransportIcons";
import { MuteIcon, VolumeIcon, VolumeLowIcon, VolumeMinIcon } from "./icons/VolumeIcons";

export function GlobalPlayerBar() {
  const {
    track,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    togglePlay,
    next,
    prev,
    seek,
    setVolume,
    toggleMute,
  } = usePlayer();

  const volumeLevel = isMuted ? "mute" : volume >= 2 / 3 ? "high" : volume >= 1 / 3 ? "low" : "min";
  const VolumeGlyph = isMuted
    ? MuteIcon
    : volume >= 2 / 3
      ? VolumeIcon
      : volume >= 1 / 3
        ? VolumeLowIcon
        : VolumeMinIcon;

  return (
    <div className="flex w-full items-center justify-between pointer-events-auto">
      <div className="flex flex-1 min-w-0 items-center gap-4">
        <button
          type="button"
          aria-label={isMuted ? "Unmute" : "Mute"}
          onClick={toggleMute}
          className="pfm-interactive flex size-9 shrink-0 items-center justify-center rounded-full text-foreground hover:bg-[var(--surface)] hover:scale-110 active:bg-transparent active:scale-90 active:opacity-60 focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_rgba(255,255,255,0.3)]"
        >
          <IconSwap id={volumeLevel} size={16} effect="opacity">
            <VolumeGlyph size={16} />
          </IconSwap>
        </button>
        <Slider
          value={volume}
          max={1}
          onChange={setVolume}
          width={128}
          aria-label="Volume"
          dimmed={isMuted}
        />
      </div>

      <div className="flex flex-1 items-center justify-center">
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Previous track"
            onClick={prev}
            disabled={!track}
            className="pfm-interactive flex size-20 items-center justify-center rounded-full text-foreground hover:bg-[var(--surface)] hover:scale-110 active:bg-transparent active:scale-90 active:opacity-60 focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_rgba(255,255,255,0.3)] disabled:pointer-events-none disabled:opacity-30"
          >
            <SkipBackIcon size={24} />
          </button>
          <button
            type="button"
            aria-label={isPlaying ? "Pause" : "Play"}
            onClick={togglePlay}
            disabled={!track}
            className="pfm-interactive flex size-20 items-center justify-center rounded-full border border-[var(--border-input)] hover:bg-[var(--surface)] hover:scale-110 active:bg-transparent active:scale-90 active:opacity-60 focus-visible:outline-none focus-visible:border-[var(--surface-border)] focus-visible:shadow-[0_0_0_3px_rgba(255,255,255,0.3)] disabled:pointer-events-none disabled:opacity-30"
          >
            <IconSwap id={isPlaying ? "pause" : "play"} size={24} scale={0.4} blur={10}>
              {isPlaying ? <PauseIcon size={24} /> : <PlayIcon size={24} />}
            </IconSwap>
          </button>
          <button
            type="button"
            aria-label="Next track"
            onClick={next}
            disabled={!track}
            className="pfm-interactive flex size-20 items-center justify-center rounded-full text-foreground hover:bg-[var(--surface)] hover:scale-110 active:bg-transparent active:scale-90 active:opacity-60 focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_rgba(255,255,255,0.3)] disabled:pointer-events-none disabled:opacity-30"
          >
            <SkipForwardIcon size={24} />
          </button>
        </div>
      </div>

      <div className="flex flex-1 min-w-0 items-center justify-end">
        <SeekBar currentTime={currentTime} duration={duration} onSeek={seek} disabled={!track} />
      </div>
    </div>
  );
}
