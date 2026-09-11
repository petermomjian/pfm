import { Play } from "lucide-react";
import type { Album } from "@/data/albums";

export const ALBUM_CARD_WIDTH = 214;

interface AlbumCardProps {
  album: Album;
  onSelect: (albumId: string) => void;
  onPlay: (albumId: string) => void;
  slotRef?: (el: HTMLDivElement | null) => void;
  coverRef?: (el: HTMLDivElement | null) => void;
  shadeRef?: (el: HTMLDivElement | null) => void;
}

export function AlbumCard({ album, onSelect, onPlay, slotRef, coverRef, shadeRef }: AlbumCardProps) {
  return (
    <div
      className="flex w-[214px] shrink-0 flex-col items-start gap-[54px] cursor-pointer"
      style={{ transformStyle: "preserve-3d" }}
      onClick={() => onSelect(album.id)}
    >
      <div className="flex w-full flex-col items-start gap-[36px]">
        <div className="flex w-full flex-col items-start gap-1.5 pr-8 text-xs">
          <p className="w-full text-foreground">{album.title}</p>
          <p className="w-full text-muted">{album.artist}</p>
        </div>
        <button
          type="button"
          aria-label={`Play ${album.title}`}
          onClick={(e) => {
            e.stopPropagation();
            onPlay(album.id);
          }}
          className="flex size-8 items-center justify-center rounded-full text-foreground"
        >
          <Play size={16} fill="currentColor" />
        </button>
      </div>
      <div ref={slotRef} className="relative h-[768px] w-full" style={{ transformStyle: "preserve-3d" }}>
        <div
          ref={coverRef}
          className="absolute inset-0 border will-change-transform"
          style={{
            backgroundColor: "var(--surface)",
            borderColor: "var(--surface-border)",
            transformOrigin: "center top",
          }}
        >
          <div
            ref={shadeRef}
            className="pointer-events-none absolute inset-0"
            style={{
              background: "linear-gradient(90deg, rgba(255,255,255,0.14), rgba(0,0,0,0.35))",
            }}
          />
        </div>
      </div>
    </div>
  );
}
