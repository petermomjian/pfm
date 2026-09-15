interface SeekBarProps {
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  disabled?: boolean;
}

function formatTime(seconds: number) {
  const safe = Number.isFinite(seconds) && seconds > 0 ? seconds : 0;
  const minutes = Math.floor(safe / 60);
  const secs = Math.floor(safe % 60);
  return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

const TABULAR_NUMS = { fontFeatureSettings: '"tnum" 1' } as const;
const EASE = { transitionTimingFunction: "var(--ease-out-subtle)" } as const;

export function SeekBar({ currentTime, duration, onSeek, disabled = false }: SeekBarProps) {
  const percent = duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;

  return (
    <div
      className={`group relative flex h-5 w-[108px] shrink-0 items-center justify-end hover:w-[190px] focus-within:w-[190px] active:w-[190px] ${
        disabled ? "pointer-events-none opacity-30" : ""
      }`}
      style={{ transitionProperty: "width", transitionDuration: "200ms", ...EASE }}
    >
      <input
        type="range"
        min={0}
        max={duration || 0}
        step={0.1}
        value={currentTime}
        onChange={(e) => onSeek(Number(e.target.value))}
        onPointerUp={(e) => e.currentTarget.blur()}
        disabled={disabled || !duration}
        aria-label="Seek"
        className="peer pfm-slider-input"
      />

      {/* Idle: compact "current — total" readout, slides/fades out as the track takes over */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 flex items-center justify-end gap-1.5 opacity-100 transition-[opacity,transform] duration-200 group-hover:translate-x-1.5 group-hover:opacity-0 group-focus-within:translate-x-1.5 group-focus-within:opacity-0 peer-active:translate-x-1.5 peer-active:opacity-0"
        style={{ ...EASE, ...TABULAR_NUMS }}
      >
        <span className="text-sm text-foreground">{formatTime(currentTime)}</span>
        <span className="h-0.5 w-4 shrink-0 rounded-full bg-muted" />
        <span className="text-sm text-muted">{formatTime(duration)}</span>
      </div>

      {/* Track: one continuous elapsed/remaining split shared by hover + active, fades/slides in */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 flex items-center opacity-0 -translate-x-1.5 transition-[opacity,transform] duration-200 group-hover:translate-x-0 group-hover:opacity-100 group-focus-within:translate-x-0 group-focus-within:opacity-100 peer-active:translate-x-0 peer-active:opacity-100"
        style={EASE}
      >
        {/* flex-grow tracks playback position 1:1 with no transition — it already updates every timeupdate tick, and easing that on top produces a stair-step/rubber-band stutter instead of smooth motion */}
        <div className="h-0.5 min-w-0 rounded-full bg-foreground" style={{ flexGrow: percent, flexBasis: 0 }} />
        <div className="h-0.5 min-w-0 rounded-full bg-muted" style={{ flexGrow: 100 - percent, flexBasis: 0 }} />
      </div>

      {/* Current-time label: right-aligned to the elapsed/remaining boundary, vertically centered on the track on hover, lifts clear of it while pressed */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 flex -translate-x-full items-center whitespace-nowrap opacity-0 transition-[opacity,transform] duration-200 group-hover:opacity-100 group-focus-within:opacity-100 peer-active:-translate-y-6 peer-active:opacity-100"
        style={{ left: `${percent}%`, ...EASE, ...TABULAR_NUMS }}
      >
        {/* Solid background masks the track line directly behind the digits instead of drawing a stroke through them */}
        <span className="bg-background px-1 text-sm text-foreground">{formatTime(currentTime)}</span>
      </div>
    </div>
  );
}
