import { useLayoutEffect, useRef, useState } from "react";

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

// Gap kept clear around the label when it sits inline in the track (matches the prior gap-x-1).
const LABEL_GAP = 4;
// Vertical lift of the label above the track when pressed (6px clearance above the row's top edge).
const PRESS_LIFT = 16;
// Fallback half-width (px) used until the hidden probe below measures the real one.
const FALLBACK_HALF_LABEL_WIDTH = 17;

export function SeekBar({ currentTime, duration, onSeek, disabled = false, alwaysExpanded = false }: SeekBarProps) {
  // Tracked explicitly instead of relying on the :active/peer-active pseudo-class:
  // :active drops as soon as the pointer strays outside the element's bounds
  // mid-drag, and doesn't reliably engage at all for touch (the target device
  // for `alwaysExpanded`) — both read as the "active" visuals not responding.
  // Pointer down/up/cancel fire consistently for mouse and touch alike.
  const [isPressed, setIsPressed] = useState(false);
  const percent = duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;
  const expanded = alwaysExpanded || isPressed;

  // Tabular nums make every "MM:SS" render at the same width, so measuring once covers all values.
  const probeRef = useRef<HTMLSpanElement>(null);
  const [halfLabelWidth, setHalfLabelWidth] = useState(FALLBACK_HALF_LABEL_WIDTH);
  useLayoutEffect(() => {
    const node = probeRef.current;
    if (!node) return;
    const measure = () => setHalfLabelWidth(node.getBoundingClientRect().width / 2);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const widthClass = alwaysExpanded
    ? "flex-1"
    : expanded
      ? "shrink-0 w-[190px]"
      : "shrink-0 w-[108px] hover:w-[190px] focus-within:w-[190px]";

  // Single source of truth for the label's horizontal position, shared by both the inline (hover)
  // and floating (pressed) states so pressing only bumps the label up — it never jumps sideways.
  // Clamping keeps it from overhanging the track edges near 0%/100%, same as the grid layout did implicitly.
  const center = `clamp(${halfLabelWidth}px, ${percent}%, calc(100% - ${halfLabelWidth}px))`;
  const halfWithGap = halfLabelWidth + LABEL_GAP;
  // Pressed: the label floats clear of the line, so the bars split at the true (unclamped) percent
  // and always reach the true edges — clamping here would leave a gap near 0%/100% under the label.
  const trackSplit = isPressed ? `${percent}%` : center;
  const elapsedWidth = isPressed ? trackSplit : `max(0px, calc(${center} - ${halfWithGap}px))`;
  const remainingLeft = isPressed ? trackSplit : `calc(${center} + ${halfWithGap}px)`;
  const remainingWidth = isPressed ? undefined : `max(0px, calc(100% - ${center} - ${halfWithGap}px))`;

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

      {/* Hidden probe: same text styling as the real label, used only to measure label width once. */}
      <span
        ref={probeRef}
        aria-hidden
        className="pointer-events-none absolute whitespace-nowrap text-sm opacity-0"
        style={TABULAR_NUMS}
      >
        00:00
      </span>

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

      {/* Track: elapsed segment — label — remaining segment. Elapsed/remaining are two absolutely
          positioned bars (not CSS Grid) so their edges and the label's center all derive from the same
          clamped `center` value above — that's what keeps the label from drifting sideways on press.
          Segments are omitted at the 0%/100% extremes rather than rendered at zero width, matching Figma.
          While pressed, the bars run edge-to-edge underneath the label (no reserved gap) so the track
          reads as one continuous line, and the label lifts clear of it instead of sitting in a gap. */}
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-0 transition-[opacity,transform] duration-200 ${
          expanded
            ? "translate-x-0 opacity-100"
            : "-translate-x-1.5 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 group-focus-within:translate-x-0 group-focus-within:opacity-100"
        }`}
        style={EASE}
      >
        {percent > 0 && (
          <div
            className="absolute top-1/2 h-0.5 -translate-y-1/2 rounded-full bg-foreground"
            style={{ left: 0, width: elapsedWidth }}
          />
        )}
        {percent < 100 && (
          <div
            className="absolute top-1/2 h-0.5 -translate-y-1/2 rounded-full bg-muted"
            style={isPressed ? { left: remainingLeft, right: 0 } : { left: remainingLeft, width: remainingWidth }}
          />
        )}
        <span
          className="pointer-events-none absolute top-1/2 whitespace-nowrap text-sm text-foreground transition-transform duration-200"
          style={{
            left: center,
            transform: isPressed ? `translate(-50%, calc(-100% - ${PRESS_LIFT}px))` : "translate(-50%, -50%)",
            ...EASE,
            ...TABULAR_NUMS,
          }}
        >
          {formatTime(currentTime)}
        </span>
      </div>
    </div>
  );
}
