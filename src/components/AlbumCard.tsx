import type { CSSProperties } from "react";
import { Pause, Play } from "lucide-react";
import type { Album } from "@/data/albums";
import { usePlayer } from "@/player/PlayerContext";
import { IconSwap } from "./icons/IconSwap";

// Visible thickness of the sleeve's front edge — the part of every sleeve
// that stays on-screen even when its face has rotated edge-on at center.
export const SPINE_WIDTH = 12;

// Each face plane pivots from the spine (local x=0, z=0 — nearest the
// viewer) and extends backward into -Z as local x grows toward `size`
// (deepest, farthest from the viewer). The overlay tracks that same axis so
// it always reads as transparent at the near edge, darkening toward the far
// edge, matching the Figma depth-shading reference regardless of size.
const ARTWORK_OVERLAY =
  "linear-gradient(to left, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 25%, rgba(0,0,0,0) 75%, rgba(0,0,0,0) 100%)";

interface AlbumSleeveProps {
  album: Album;
  size: number; // px — square face depth/height, shared with the perspective scene's height
  onSelect: (albumId: string) => void;
}

export function AlbumSleeve({ album, size, onSelect }: AlbumSleeveProps) {
  const faceStyle: CSSProperties = {
    width: size,
    height: size,
    backgroundColor: "var(--surface)",
    backgroundImage: ARTWORK_OVERLAY,
    borderColor: "var(--surface-border)",
    transformOrigin: "left top",
    backfaceVisibility: "hidden",
  };

  return (
    <div
      className="relative h-full shrink-0 cursor-pointer"
      style={{ width: SPINE_WIDTH, transformStyle: "preserve-3d" }}
      onClick={() => onSelect(album.id)}
    >
      <div
        className="absolute inset-y-0 left-0 border"
        style={{
          width: SPINE_WIDTH,
          backgroundColor: "var(--surface)",
          borderColor: "var(--surface-border)",
        }}
      />
      {/* Face extends backward from the spine into -Z; the sleeve passing
          through screen center becomes edge-on purely from that projection. */}
      <div className="absolute left-0 top-0 border" style={{ ...faceStyle, transform: "rotateY(90deg)" }} />
      {/* Same plane, opposite normal (scaleZ flips facing without moving the
          geometry) — keeps the far side of center from disappearing. */}
      <div className="absolute left-0 top-0 border" style={{ ...faceStyle, transform: "rotateY(90deg) scaleZ(-1)" }} />
    </div>
  );
}

interface AlbumMetaProps {
  album: Album;
  onSelect: (albumId: string) => void;
  onPlay: (albumId: string) => void;
}

export function AlbumMeta({ album, onSelect, onPlay }: AlbumMetaProps) {
  const { track, isPlaying, togglePlay } = usePlayer();
  const isThisAlbumActive = Boolean(track && album.tracks.some((t) => t.id === track.id));
  const isThisAlbumPlaying = isThisAlbumActive && isPlaying;

  return (
    <div className="relative shrink-0" style={{ width: SPINE_WIDTH }}>
      <div
        className="absolute bottom-0 left-0 flex flex-col items-start gap-[36px] cursor-pointer"
        style={{ width: "var(--slot-width)" }}
        onClick={() => onSelect(album.id)}
      >
        <div className="flex w-full flex-col items-start gap-1.5 pr-8 text-xs">
          <p className="w-full text-foreground">{album.title}</p>
          <p className="w-full text-muted">{album.artist}</p>
        </div>
        <button
          type="button"
          aria-label={isThisAlbumPlaying ? `Pause ${album.title}` : `Play ${album.title}`}
          onClick={(e) => {
            e.stopPropagation();
            if (isThisAlbumActive) {
              togglePlay();
            } else {
              onPlay(album.id);
            }
          }}
          className="pfm-interactive flex size-9 items-center justify-center rounded-full text-foreground hover:bg-[var(--surface)] hover:scale-110 active:bg-transparent active:scale-90 active:opacity-60 focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_rgba(255,255,255,0.3)]"
        >
          <IconSwap id={isThisAlbumPlaying ? "pause" : "play"} size={16} scale={0.4} blur={10}>
            {isThisAlbumPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
          </IconSwap>
        </button>
      </div>
    </div>
  );
}
