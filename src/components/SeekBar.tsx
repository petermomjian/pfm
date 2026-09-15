import { useState } from "react";

interface SeekBarProps {
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  disabled?: boolean;
  /** Mobile: permanently shows what is otherwise the hover-only "track" state (no hover on touch), full width. */
  alwaysExpanded?: boolean;
}

export function formatTime(seconds: number) {
  const safe = Number.isFinite(seconds) && seconds > 0 ? seconds : 0;
  const minutes = Math.floor(safe / 60);
  const secs = Math.floor(safe % 60);
  return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

const TABULAR_NUMS = { fontFeatureSettings: '"tnum" 1' } as const;
const EASE = { transitionTimingFunction: "var(--ease-out-subtle)" } as const;

export function SeekBar({ currentTime, duration, onSeek, disabled = false, alwaysExpanded = false }: SeekBarProps) {
  // Tracked explicitly instead of relying on the :active/peer-active pseudo-class:
  // :active drops as soon as the pointer strays outside the element's bounds
  // mid-drag, and doesn't reliably engage at all for touch (the target device
  // for `alwaysExpanded`) — both read as the "active" visuals not responding.
  // Pointer down/up/cancel fire consistently for mouse and touch alike.
  const [isPressed, setIsPressed] = useState(false);
  const percent = duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;
  const expanded = alwaysExpanded || isPressed;

  const widthClass = alwaysExpanded
    ? "flex-1"
    : expanded
      ? "shrink-0 w-[190px]"
      : "shrink-0 w-[108px] hover:w-[190px] focus-within:w-[190px]";

  return (
    <div
      className={`group relative flex h-5 items-center justify-end ${widthClass} ${
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
        onPointerDown={() => setIsPressed(true)}
        onPointerUp={(e) => {
          setIsPressed(false);
          e.currentTarget.blur();
        }}
        onPointerCancel={() => setIsPressed(false)}
        disabled={disabled || !duration}
        aria-label="Seek"
        className="pfm-slider-input"
      />

      {/* Idle: compact "current — total" readout, slides/fades out as the track takes over. Never shown when alwaysExpanded. */}
      {!alwaysExpanded && (
        <div
          aria-hidden
          className={`pointer-events-none absolute inset-0 flex items-center justify-end gap-1.5 transition-[opacity,transform] duration-200 ${
            expanded
              ? "translate-x-1.5 opacity-0"
              : "opacity-100 group-hover:translate-x-1.5 group-hover:opacity-0 group-focus-within:translate-x-1.5 group-focus-within:opacity-0"
          }`}
          style={{ ...EASE, ...TABULAR_NUMS }}
        >
          <span className="text-sm text-foreground">{formatTime(currentTime)}</span>
          <span className="h-0.5 w-4 shrink-0 rounded-full bg-muted" />
          <span className="text-sm text-muted">{formatTime(duration)}</span>
        </div>
      )}

      {/* Track: one continuous elapsed/remaining split shared by hover + active, fades/slides in */}
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-0 flex items-center transition-[opacity,transform] duration-200 ${
          expanded
            ? "translate-x-0 opacity-100"
            : "-translate-x-1.5 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 group-focus-within:translate-x-0 group-focus-within:opacity-100"
        }`}
        style={EASE}
      >
        {/* flex-grow tracks playback position 1:1 with no transition — it already updates every timeupdate tick, and easing that on top produces a stair-step/rubber-band stutter instead of smooth motion */}
        <div className="h-0.5 min-w-0 rounded-full bg-foreground" style={{ flexGrow: percent, flexBasis: 0 }} />
        <div className="h-0.5 min-w-0 rounded-full bg-muted" style={{ flexGrow: 100 - percent, flexBasis: 0 }} />
      </div>

      {/* Current-time label: right-aligned to the elapsed/remaining boundary, vertically centered on the track, lifts clear of it while pressed */}
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-y-0 flex -translate-x-full items-center whitespace-nowrap transition-[opacity,transform] duration-200 ${
          isPressed ? "-translate-y-6" : ""
        } ${
          expanded
            ? "opacity-100"
            : "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"
        }`}
        style={{ left: `${percent}%`, ...EASE, ...TABULAR_NUMS }}
      >
        {/* Solid background masks the track line directly behind the digits instead of drawing a stroke through them */}
        <span className="bg-background px-1 text-sm text-foreground">{formatTime(currentTime)}</span>
      </div>
    </div>
  );
}
