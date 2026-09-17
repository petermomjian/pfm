import type { CSSProperties, Ref } from "react";
import { Pause, Play } from "lucide-react";
import type { Album } from "@/data/albums";
import { usePlayer } from "@/player/PlayerContext";
import { useEdgeColor } from "@/hooks/useEdgeColor";
import { IconSwap } from "./icons/IconSwap";

// Visible thickness of the sleeve's front edge — the part of every sleeve
// that stays on-screen even when its face has rotated edge-on at center.
// This doubles as the sleeve's actual Z depth: the front and back cover
// planes below sit exactly this far apart, so the spine is a real connecting
// face of the box, not a decorative border painted at an arbitrary width.
export const SPINE_WIDTH = 12;

// Fill for the sleeve's plain material faces (top/bottom/far edges) rather
// than artwork.
const EDGE_COLOR = "#1c1c1f";

// The front cover pivots from the spine (local x=0, z=0 — nearest the
// viewer) and extends backward into -Z as local x grows toward `size`
// (deepest, farthest from the viewer). The overlay tracks that same axis so
// it always reads as transparent at the near edge, darkening toward the far
// edge, matching the Figma depth-shading reference regardless of size.
const ARTWORK_OVERLAY =
  "linear-gradient(to left, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 25%, rgba(0,0,0,0) 75%, rgba(0,0,0,0) 100%)";

// The back cover is the same plane pivoted from the opposite edge (see
// AlbumSleeve below), so its local x runs near→far in the reverse direction
// of the front cover's. Mirroring the gradient's own direction to match
// keeps "transparent at the near edge, dark at the far edge" true in world
// space for both faces — this flips the shading, never the artwork itself.
const ARTWORK_OVERLAY_BACK =
  "linear-gradient(to right, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 25%, rgba(0,0,0,0) 75%, rgba(0,0,0,0) 100%)";

// Every sleeve face is outlined with a 1px stroke. Read literally, that
// stroke is a real edge of the box, so it should recede exactly like the
// artwork above does: strongest at the near edge (the spine, z=0), fading to
// nothing by the far edge (z=-size) — a depth fade, not a top/bottom one.
// border-image (rather than a mask or an overlay) fades only the stroke
// itself, leaving the artwork/vinyl untouched, and it shares the exact same
// local near→far axis as ARTWORK_OVERLAY/_BACK above — so front cover and
// the top/bottom walls (whose local x sweeps the same depth span as the
// front cover, see edgeWallStyle) use the front-facing direction, and the
// back cover mirrors it exactly like ARTWORK_OVERLAY_BACK does.
const OUTLINE_FADE_FRONT =
  "linear-gradient(to right, var(--surface-border) 0%, var(--surface-border) 25%, transparent 75%, transparent 100%) 1";
const OUTLINE_FADE_BACK =
  "linear-gradient(to left, var(--surface-border) 0%, var(--surface-border) 25%, transparent 75%, transparent 100%) 1";

// The top/bottom walls are flat EDGE_COLOR fills, not artwork, but they span
// the exact same near→far depth as the front cover (see edgeWallStyle) — so
// left as a solid fill, the far end reads as a hard-edged grey rectangle
// floating in the black background instead of receding into it like every
// other face already does. Fading the fill itself, on the same axis and
// stops as OUTLINE_FADE_FRONT, keeps it consistent with the artwork/outline
// depth cues instead of standing out as the one un-faded material.
const EDGE_FILL_FADE = `linear-gradient(to right, ${EDGE_COLOR} 0%, ${EDGE_COLOR} 25%, transparent 75%, transparent 100%)`;

interface AlbumSleeveProps {
  album: Album;
  size: number; // px — square face depth/height, shared with the perspective scene's height
  onSelect: (albumId: string) => void;
  // True while the matching AlbumMeta's title or play button is hovered —
  // lifts the sleeve to echo that hover back onto the artwork.
  raised?: boolean;
  // False for sleeves scrolled far from the currently-centered position (see
  // AlbumLibrary's activeRange windowing). The front/back cover planes are
  // each a full-resolution image texture composited as its own GPU layer —
  // with every sleeve in the loop mounted at once, that's the memory that
  // exceeds mobile WebKit's per-tab GPU budget and crashes the tab. Distant
  // sleeves are also nearly edge-on in the shared perspective, so skipping
  // just these two layers there is visually unnoticeable. Every other
  // face (spine, edges, top/bottom walls) stays mounted regardless, so
  // layout/spacing math never depends on this flag.
  full?: boolean;
}

// Builds the sleeve as a true 6-sided box in the shared preserve-3d scene: a
// front cover plane and a second, independent back-cover plane, offset by
// the sleeve's real thickness (SPINE_WIDTH) and rotated a further 180°
// about Y so its own outward normal points the opposite way from the front
// cover's — a real box wall, not the front face re-shown with a flipped
// normal. Spine/far/top/bottom faces fill the gap between their matching
// edges.
//
// The scene shares one off-center perspective vanishing point across every
// sleeve in the row, so as a sleeve scrolls past it, which one of the two
// cover planes actually faces the camera flips. Both are marked
// backface-visibility: hidden, so whichever one is facing away simply
// disappears instead of rendering its artwork mirrored — the CSS default
// for a visible backface — which is what a bare rotateY(90deg) front cover
// did on the far side of the vanishing point before this pairing existed.
// Because at most one of the pair is ever visible at once, there's no
// remaining ambiguity for Chromium's true 3D depth-sort to get wrong, so
// unlike the thin edge faces, the covers don't need a flattened wrapper to
// force paint order.
export function AlbumSleeve({ album, size, onSelect, raised = false, full = true }: AlbumSleeveProps) {
  // Ties the spine's fill to the artwork's own outer-edge color so the sleeve
  // reads as continuous with the cover instead of a fixed neutral fill.
  const spineColor = useEdgeColor(album.coverArt, "var(--surface)");

  const faceStyle: CSSProperties = {
    width: size,
    height: size,
    backgroundColor: "var(--surface)",
    backgroundImage: `${ARTWORK_OVERLAY}, url(${album.coverArt})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
    borderImage: OUTLINE_FADE_FRONT,
    transformOrigin: "left top",
    backfaceVisibility: "hidden",
  };

  // Same footprint as the front face, rotated a further 180° about Y so its
  // normal points the opposite way, and re-offset so it still lines up with
  // the box's spine-to-far-edge span — a genuine second plane facing the
  // other direction, not the front face re-shown with a flipped normal.
  const backFaceStyle: CSSProperties = {
    ...faceStyle,
    backgroundImage: `${ARTWORK_OVERLAY_BACK}, url(${album.coverArt})`,
    borderImage: OUTLINE_FADE_BACK,
  };

  // Top/bottom walls: real quads spanning the full receding depth (size) by
  // the sleeve's thickness (SPINE_WIDTH) — the "roof" and "floor" that
  // stitch the front face's top/bottom edge to the back face's, not a flat
  // strip painted alongside the face.
  const edgeWallStyle: CSSProperties = {
    width: size,
    height: SPINE_WIDTH,
    backgroundColor: "transparent",
    backgroundImage: EDGE_FILL_FADE,
    borderImage: OUTLINE_FADE_FRONT,
    transformOrigin: "left top",
  };

  return (
    <div
      className="pfm-sleeve-lift relative h-full shrink-0 cursor-pointer"
      style={{
        width: SPINE_WIDTH,
        transformStyle: "preserve-3d",
        transform: raised ? "translateY(-24px)" : "translateY(0px)",
      }}
      onClick={() => onSelect(album.id)}
    >
      {/* Spine: the sleeve's near edge, facing the camera head-on (never
          rotated) — connects the front face's near boundary to the back
          face's near boundary, SPINE_WIDTH away. Sits at a single, constant
          depth (z=0, the nearest point on the whole box), so unlike the
          faces its stroke never fades — it's the outline's full-strength end. */}
      <div
        className="absolute inset-y-0 left-0 border"
        style={{
          width: SPINE_WIDTH,
          backgroundColor: spineColor,
          borderColor: "var(--surface-border)",
          transition: "background-color 400ms var(--ease-out-subtle)",
        }}
      />
      {/* Far edge: the same near-edge geometry, pushed straight back by the
          sleeve's full receding depth — connects the front and back faces'
          deepest boundary. Sits at a single, constant depth (z=-size, the
          farthest point on the whole box) — the far end of every other
          face's depth fade, where they've already faded to nothing — so
          both its stroke and its fill match that: fully faded out, not
          drawn at all. A flat EDGE_COLOR fill here (this face has no depth
          range of its own to fade across) read as a hard-edged grey
          rectangle floating in the black background whenever it isn't
          fully covered by the nearer front/back cover, instead of
          receding into it like the rest of the box already does.
          Perspective still foreshortens it down to a thin sliver at
          extreme rotation — this only fixes its color, not its geometry. */}
      <div
        className="absolute inset-y-0 left-0 border"
        style={{
          width: SPINE_WIDTH,
          backgroundColor: "transparent",
          borderColor: "transparent",
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

      {/* Back/front cover — the two image-textured GPU layers, skipped
          entirely (not just hidden) when `full` is false. See the `full`
          prop's doc comment above. */}
      {full && (
        <>
          {/* Back cover: rotateY(270deg) gives it the opposite outward normal
              (-X) from the front cover's (+X), so it hinges from the spine's
              own near edge (x=0, no X offset) rather than the front cover's —
              its near edge lands on the box's -X wall, the side its normal
              actually points toward, instead of sharing the front cover's
              hinge line. */}
          <div
            className="absolute left-0 top-0 border"
            style={{ ...backFaceStyle, transform: `translateZ(-${size}px) rotateY(270deg)` }}
          />

          {/* Front cover: the album artwork, extending backward from the
              spine into -Z. Hinges from the far (+X) edge of the spine — the
              side its rotateY(90deg) normal (+X) actually points toward — so
              each cover's near edge sits on the wall its own normal faces,
              not its sibling's. */}
          <div
            className="absolute left-0 top-0 border"
            style={{ ...faceStyle, transform: `translateX(${SPINE_WIDTH}px) rotateY(90deg)` }}
          />
        </>
      )}
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
  // Reported while the title-through-play-button area is hovered, so the
  // library row can lift this album's sleeve in the separate perspective
  // scene. Bound to the whole flex column (not the title/button individually)
  // so the gap between them stays part of one continuous hover region —
  // otherwise crossing it drops the hover and bounces the sleeve.
  onHoverChange?: (hovering: boolean) => void;
}

export function AlbumMeta({ album, onSelect, onPlay, contentRef, onHoverChange }: AlbumMetaProps) {
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
        onMouseEnter={() => onHoverChange?.(true)}
        onMouseLeave={() => onHoverChange?.(false)}
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
