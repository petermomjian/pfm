interface VinylMarkProps {
  size: number;
  spinning?: boolean;
  className?: string;
}

// Reconstructed from the Figma "Player" placeholder graphic: an outer disc,
// a label ring, and a center spindle dot, all proportional to a 512px viewBox.
export function VinylMark({ size, spinning = false, className }: VinylMarkProps) {
  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: "9999px",
        backgroundColor: "var(--surface)",
        position: "relative",
        flexShrink: 0,
        animation: spinning ? "vinyl-spin 8s linear infinite" : undefined,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          margin: "auto",
          width: size * 0.4,
          height: size * 0.4,
          borderRadius: "9999px",
          backgroundColor: "rgba(10, 10, 10, 0.5)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          margin: "auto",
          width: size * 0.05,
          height: size * 0.05,
          borderRadius: "9999px",
          backgroundColor: "var(--surface-strong)",
        }}
      />
    </div>
  );
}
