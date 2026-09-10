import { Play } from "lucide-react";
import type { Album } from "@/data/albums";

interface AlbumCardProps {
  album: Album;
  onSelect: (albumId: string) => void;
  onPlay: (albumId: string) => void;
}

export function AlbumCard({ album, onSelect, onPlay }: AlbumCardProps) {
  return (
    <div
      className="flex w-[214px] shrink-0 flex-col items-start gap-[54px] cursor-pointer"
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
      <div
        className="h-[768px] w-full border"
        style={{ backgroundColor: "var(--surface)", borderColor: "var(--surface-border)" }}
      />
    </div>
  );
}
