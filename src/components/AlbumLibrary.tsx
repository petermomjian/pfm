import { albums } from "@/data/albums";
import { AlbumCard } from "./AlbumCard";

interface AlbumLibraryProps {
  onSelect: (albumId: string) => void;
  onPlay: (albumId: string) => void;
}

export function AlbumLibrary({ onSelect, onPlay }: AlbumLibraryProps) {
  return (
    <div className="absolute inset-x-0 top-0 bottom-[-277px] flex items-end justify-center overflow-x-auto overflow-y-hidden">
      <div className="flex items-end">
        {albums.map((album) => (
          <AlbumCard key={album.id} album={album} onSelect={onSelect} onPlay={onPlay} />
        ))}
      </div>
    </div>
  );
}
