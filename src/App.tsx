import { useState } from "react";
import { albums } from "@/data/albums";
import { PlayerProvider, usePlayer } from "@/player/PlayerContext";
import { Header } from "@/components/Header";
import { GlobalPlayerBar } from "@/components/GlobalPlayerBar";
import { AlbumLibrary } from "@/components/AlbumLibrary";
import { FocusedAlbum } from "@/components/FocusedAlbum";

function Stage({
  view,
  onSelect,
  onBack,
}: {
  view: { screen: "library" } | { screen: "focused"; albumId: string };
  onSelect: (albumId: string) => void;
  onBack: () => void;
}) {
  const { playTrack } = usePlayer();

  const handlePlay = (albumId: string) => {
    const album = albums.find((a) => a.id === albumId);
    const firstTrack = album?.tracks[0];
    if (album && firstTrack) playTrack(album.id, firstTrack.id);
    onSelect(albumId);
  };

  if (view.screen === "focused") {
    const album = albums.find((a) => a.id === view.albumId);
    if (!album) return null;
    return <FocusedAlbum album={album} onBack={onBack} />;
  }

  return <AlbumLibrary onSelect={onSelect} onPlay={handlePlay} />;
}

function AppShell() {
  const [view, setView] = useState<{ screen: "library" } | { screen: "focused"; albumId: string }>({
    screen: "library",
  });

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-background text-foreground">
      <Stage
        view={view}
        onSelect={(albumId) => setView({ screen: "focused", albumId })}
        onBack={() => setView({ screen: "library" })}
      />

      <div className="pointer-events-none absolute inset-0 flex flex-col items-center">
        <div className="flex h-full w-full max-w-[1920px] flex-col justify-between px-16 py-9">
          <Header />
          <GlobalPlayerBar />
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <PlayerProvider>
      <AppShell />
    </PlayerProvider>
  );
}

export default App;
