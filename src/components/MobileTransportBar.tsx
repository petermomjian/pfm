import { usePlayer } from "@/player/PlayerContext";
import { SeekBar } from "./SeekBar";
import { VinylMark } from "./VinylMark";
import { IconSwap } from "./icons/IconSwap";
import { PauseIcon, PlayIcon, SkipBackIcon, SkipForwardIcon } from "./icons/TransportIcons";
import { MuteIcon, VolumeIcon } from "./icons/VolumeIcons";

const GHOST_BUTTON =
  "pfm-interactive flex flex-1 h-20 items-center justify-center rounded-full text-foreground hover:bg-[var(--surface)] active:bg-transparent active:opacity-60 focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_rgba(255,255,255,0.3)] disabled:pointer-events-none disabled:opacity-30";

export function MobileTransportBar() {
  const {
    track,
    isPlaying,
    isAudioPlaying,
    currentTime,
    duration,
    isMuted,
    togglePlay,
    next,
    prev,
    toggleMute,
    seek,
  } = usePlayer();

  const volumeLevel = isMuted ? "mute" : "high";
  const VolumeGlyph = isMuted ? MuteIcon : VolumeIcon;

  return (
    <div className="pointer-events-auto flex w-full flex-col gap-6">
      <div className="flex w-full items-center gap-6">
        <button
          type="button"
          aria-label={isMuted ? "Unmute" : "Mute"}
          onClick={toggleMute}
          className="pfm-interactive flex size-9 shrink-0 items-center justify-center rounded-full text-foreground hover:bg-[var(--surface)] active:bg-transparent active:opacity-60 focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_rgba(255,255,255,0.3)]"
        >
          <IconSwap id={volumeLevel} size={16} effect="opacity">
            <VolumeGlyph size={16} />
          </IconSwap>
        </button>

        <SeekBar currentTime={currentTime} duration={duration} onSeek={seek} disabled={!track} alwaysExpanded />

        <VinylMark size={36} spinning={isAudioPlaying} flat={!track} className="shrink-0" />
      </div>

      <div className="flex w-full items-center gap-1">
        <button
          type="button"
          aria-label="Previous track"
          onClick={prev}
          disabled={!track}
          className={GHOST_BUTTON}
        >
          <SkipBackIcon size={24} />
        </button>
        <button
          type="button"
          aria-label={isPlaying ? "Pause" : "Play"}
          onClick={togglePlay}
          disabled={!track}
          className="pfm-interactive flex h-20 flex-1 items-center justify-center rounded-full border border-[var(--border-input)] text-foreground hover:bg-[var(--surface)] active:bg-transparent active:opacity-60 focus-visible:outline-none focus-visible:border-[var(--surface-border)] focus-visible:shadow-[0_0_0_3px_rgba(255,255,255,0.3)] disabled:pointer-events-none disabled:opacity-30"
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
          className={GHOST_BUTTON}
        >
          <SkipForwardIcon size={24} />
        </button>
      </div>
    </div>
  );
}
