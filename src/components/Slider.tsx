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
      className="relative flex items-center py-1"
      style={{ width, opacity: dimmed ? 0.5 : 1 }}
    >
      <div className="h-1 w-full rounded-full" style={{ backgroundColor: "var(--border-input)" }}>
        <div
          className="h-1 rounded-full"
          style={{ width: `${percent}%`, backgroundColor: "var(--primary)" }}
        />
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute rounded-full border"
        style={{
          left: `calc(${percent}% - 12px)`,
          width: 24,
          height: 16,
          backgroundColor: "#ffffff",
          borderColor: "#e5e5e5",
        }}
      />
      <input
        type="range"
        min={0}
        max={max}
        step={max > 1 ? 0.1 : 0.01}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={aria["aria-label"]}
        className="pfm-slider-input"
      />
    </div>
  );
}
