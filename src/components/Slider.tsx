interface SliderProps {
  value: number;
  max: number;
  onChange: (value: number) => void;
  width?: number;
  dimmed?: boolean;
  "aria-label"?: string;
}

export function Slider({ value, max, onChange, width = 128, dimmed = false, ...aria }: SliderProps) {
  const percent = max > 0 ? (value / max) * 100 : 0;

  return (
    <div
      className="pfm-interactive relative flex h-3 items-center"
      style={{ width, opacity: dimmed ? 0.5 : 1 }}
    >
      <input
        type="range"
        min={0}
        max={max}
        step={max > 1 ? 0.1 : 0.01}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={aria["aria-label"]}
        className="peer pfm-slider-input"
      />
      <div
        aria-hidden
        className="pointer-events-none h-1 w-full rounded-full peer-hover:h-3 peer-active:h-3 peer-focus-visible:h-3"
        style={{
          backgroundColor: "var(--border-input)",
          transition: "height 150ms var(--ease-out-subtle)",
        }}
      >
        <div className="h-full rounded-full" style={{ width: `${percent}%`, backgroundColor: "var(--primary)" }} />
      </div>
    </div>
  );
}
