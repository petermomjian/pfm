import { useEffect, useState } from "react";
import type { Track } from "@/data/albums";

interface TrackRowProps {
  track: Track;
  isActive: boolean;
  onPlay: () => void;
}

export function TrackRow({ track, isActive, onPlay }: TrackRowProps) {
  // Tracked explicitly instead of relying on the `active:` pseudo-class: the
  // tracklist scrolls by touch directly over these rows, and mobile browsers
  // keep `:active` engaged on whatever row a touch started on for the whole
  // gesture, even once it turns into scrolling past that row — it reads as
  // the row staying "pressed" while the user is just scrolling.
  const [isPressed, setIsPressed] = useState(false);

  // Belt-and-suspenders over the pointer handlers below: WebKit doesn't
  // reliably fire `pointercancel` when a touch that started on a descendant
  // button hands off to an ancestor's native scroll, so a press can still get
  // stuck through the whole scroll on iOS. A `scroll` event on the tracklist's
  // container is unambiguous proof the gesture became a scroll, so it's a
  // reliable fallback — listened for in the capture phase since `scroll`
  // doesn't bubble, and only while actually pressed to keep this cheap.
  useEffect(() => {
    if (!isPressed) return;
    const clear = () => setIsPressed(false);
    window.addEventListener("scroll", clear, { capture: true, passive: true });
    return () => window.removeEventListener("scroll", clear, true);
  }, [isPressed]);

  return (
    <button
      type="button"
      onClick={onPlay}
      onPointerDown={() => setIsPressed(true)}
      onPointerUp={() => setIsPressed(false)}
      onPointerCancel={() => setIsPressed(false)}
      onPointerLeave={() => setIsPressed(false)}
      className={`pfm-interactive group flex items-start gap-4 py-1 text-left text-sm w-full hover:opacity-80 hover:translate-x-1 ${
        isPressed ? "opacity-60" : ""
      }`}
    >
      <span className={`pfm-track-number w-8 shrink-0 ${isActive ? "text-foreground" : "text-muted group-hover:text-foreground"}`}>
        {track.index}
      </span>
      <span className="text-foreground">{track.title}</span>
    </button>
  );
}
