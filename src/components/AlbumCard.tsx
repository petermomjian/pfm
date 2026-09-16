import type { CSSProperties, Ref } from "react";
import { Pause, Play } from "lucide-react";
import type { Album } from "@/data/albums";
import { usePlayer } from "@/player/PlayerContext";
import { IconSwap } from "./icons/IconSwap";

// Visible thickness of the sleeve's front edge — the part of every sleeve
// that stays on-screen even when its face has rotated edge-on at center.
// This doubles as the sleeve's actual Z depth: the front and back cover
// planes below sit exactly this far apart, so the spine is a real connecting
// face of the box, not a decorative border painted at an arbitrary width.
export const SPINE_WIDTH = 12;

// Fill for every face except the printed front cover — the "material" of
// the sleeve (inner back cover, top/bottom/far edges) rather than artwork.
const EDGE_COLOR = "#1c1c1f";

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

// Builds the sleeve as a true 6-sided box in the shared preserve-3d scene: a
// front cover plane and a second, parallel back-cover plane offset by the
// sleeve's real thickness (SPINE_WIDTH) along its own depth axis, with
// spine/far/top/bottom faces filling the gap between their matching edges.
// Faces are left at the default backface-visibility (visible) rather than
// hidden — hiding backfaces relies on the browser picking the correctly-
// oriented copy per-face, which this scene's shared off-center perspective
// gets wrong for sleeves on one side of the vanishing point, silently
// dropping their edge/back geometry.
//
// The back-facing geometry (far edge, top/bottom walls, back cover) is a
// real box interior: for sleeves left of the scene's single shared vanishing
// point, the camera ends up sitting past the back cover's own plane, so true
// 3D depth genuinely puts it nearer the camera than the front cover — DOM
// order alone can't override that once both are real siblings in the same
// preserve-3d context, because Chromium depth-sorts siblings there instead
// of always deferring to paint order. Wrapping that geometry in a plain
// (non-preserve-3d) group flattens it into one layer *before* it competes
// with the front cover, so the front cover — a later sibling of the group,
// not of the individual back faces — reliably wins on both sides.
export function AlbumSleeve({ album, size, onSelect }: AlbumSleeveProps) {
  const faceStyle: CSSProperties = {
    width: size,
    height: size,
    backgroundColor: "var(--surface)",
    backgroundImage: ARTWORK_OVERLAY,
    borderColor: "var(--surface-border)",
    transformOrigin: "left top",
  };

  // Same footprint as the front face, translated along its own (already
  // rotated) depth axis by the real sleeve thickness — a genuine second
  // plane, not the front face re-shown with a flipped normal.
  const backFaceStyle: CSSProperties = {
    ...faceStyle,
    backgroundColor: EDGE_COLOR,
    backgroundImage: undefined,
  };

  // Top/bottom walls: real quads spanning the full receding depth (size) by
  // the sleeve's thickness (SPINE_WIDTH) — the "roof" and "floor" that
  // stitch the front face's top/bottom edge to the back face's, not a flat
  // strip painted alongside the face.
  const edgeWallStyle: CSSProperties = {
    width: size,
    height: SPINE_WIDTH,
    backgroundColor: EDGE_COLOR,
    borderColor: "var(--surface-border)",
    transformOrigin: "left top",
  };

  return (
    <div
      className="relative h-full shrink-0 cursor-pointer"
      style={{ width: SPINE_WIDTH, transformStyle: "preserve-3d" }}
      onClick={() => onSelect(album.id)}
    >
      {/* Spine: the sleeve's near edge, facing the camera head-on (never
          rotated) — connects the front face's near boundary to the back
          face's near boundary, SPINE_WIDTH away. */}
      <div
        className="absolute inset-y-0 left-0 border"
        style={{ width: SPINE_WIDTH, backgroundColor: "var(--surface)", borderColor: "var(--surface-border)" }}
      />
      {/* Far edge: the same near-edge geometry, pushed straight back by the
          sleeve's full receding depth — connects the front and back faces'
          deepest boundary. */}
      <div
        className="absolute inset-y-0 left-0 border"
        style={{
          width: SPINE_WIDTH,
          backgroundColor: EDGE_COLOR,
          borderColor: "var(--surface-border)",
          transform: `translateZ(-${size}px)`,
        }}
      />

      {/* Top wall — rotateY matches the faces' own receding path; rotateX
          then folds the panel flat so it bridges the front/back faces' top
          edges instead of duplicating the faces' own vertical plane. */}
      <div className="absolute left-0 top-0 border" style={{ ...edgeWallStyle, transform: "rotateY(90deg) rotateX(90deg)" }} />
      {/* Bottom wall — identical geometry, shifted down by the full face
          height so it bridges the bottom edges instead. */}
      <div className="absolute left-0 border" style={{ ...edgeWallStyle, top: size, transform: "rotateY(90deg) rotateX(90deg)" }} />

      {/* Back cover, alone, in a flat (non-preserve-3d) wrapper: it's the
          one face large enough that Chromium's true depth-sort (see the
          comment above this component) can flip it in front of the front
          cover; the thin far/top/bottom edges stay true preserve-3d
          siblings of the front cover so their real depth-sorted seam against
          it — the lit edge line along the taper — still renders. */}
      <div className="absolute inset-0">
        <div className="absolute left-0 top-0 border" style={{ ...backFaceStyle, transform: `rotateY(90deg) translateZ(${SPINE_WIDTH}px)` }} />
      </div>

      {/* Front cover (the album artwork) extends backward from the spine
          into -Z; a later sibling of the interior group above so it always
          occludes it, on both sides of the scene's fixed vanishing point. */}
      <div className="absolute left-0 top-0 border" style={{ ...faceStyle, transform: "rotateY(90deg)" }} />
    </div>
  );
}

interface AlbumMetaProps {
  album: Album;
  onSelect: (albumId: string) => void;
  onPlay: (albumId: string) => void;
  // Attached only to a representative item so the library row can measure
  // its real rendered height (title/artist text can wrap) and keep it clear
  // of the header above.
  contentRef?: Ref<HTMLDivElement>;
}

export function AlbumMeta({ album, onSelect, onPlay, contentRef }: AlbumMetaProps) {
  const { track, isPlaying, togglePlay } = usePlayer();
  const isThisAlbumActive = Boolean(track && album.tracks.some((t) => t.id === track.id));
  const isThisAlbumPlaying = isThisAlbumActive && isPlaying;

  return (
    <div className="relative shrink-0" style={{ width: SPINE_WIDTH }}>
      <div
        ref={contentRef}
        className="absolute bottom-0 left-0 flex -translate-x-3 flex-col items-start gap-[36px] cursor-pointer"
        style={{ width: "var(--slot-width)" }}
        onClick={() => onSelect(album.id)}
      >
        <div className="pfm-interactive -m-3 flex w-full translate-x-3 flex-col items-start gap-1.5 rounded-[8px] p-3 text-xs hover:bg-[var(--surface)]">
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
