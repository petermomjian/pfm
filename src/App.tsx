import { useState } from "react";
import { albums } from "@/data/albums";
import { PlayerProvider, usePlayer } from "@/player/PlayerContext";
import { useIsMobile } from "@/hooks/useIsMobile";
import { Header } from "@/components/Header";
import { GlobalPlayerBar } from "@/components/GlobalPlayerBar";
import { MobileTransportBar } from "@/components/MobileTransportBar";
import { AlbumLibrary } from "@/components/AlbumLibrary";
import { FocusedAlbum, BackToLibrary } from "@/components/FocusedAlbum";

type View = { screen: "library" } | { screen: "focused"; albumId: string };

function Stage({
  view,
  onSelect,
  onBack,
  isMobile,
}: {
  view: View;
  onSelect: (albumId: string) => void;
  onBack: () => void;
  isMobile: boolean;
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
    return <FocusedAlbum album={album} onBack={onBack} isMobile={isMobile} />;
  }

  return <AlbumLibrary onSelect={onSelect} onPlay={handlePlay} />;
}

function AppShell() {
  const [view, setView] = useState<View>({ screen: "library" });
  const isMobile = useIsMobile();
  const onBack = () => setView({ screen: "library" });
  const onSelect = (albumId: string) => setView({ screen: "focused", albumId });

  const focusedAlbum = view.screen === "focused" ? albums.find((a) => a.id === view.albumId) : undefined;

  return (
    <div className="relative h-dvh w-screen overflow-hidden bg-background text-foreground">
      <Stage view={view} onSelect={onSelect} onBack={onBack} isMobile={isMobile} />

      <div className="pointer-events-none absolute inset-0 flex flex-col items-center">
        {isMobile && focusedAlbum && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-48 bg-gradient-to-b from-transparent to-black" />
        )}
        <div className="pfm-fluid relative z-20 flex h-full w-full max-w-[1920px] flex-col justify-between px-6 py-9 md:px-16">
          {isMobile && focusedAlbum ? (
            <div className="pointer-events-auto flex w-full items-center justify-start">
              <BackToLibrary album={focusedAlbum} onBack={onBack} />
            </div>
          ) : (
            <Header onSelectAlbum={onSelect} />
          )}
          {isMobile ? <MobileTransportBar onSelectAlbum={onSelect} /> : <GlobalPlayerBar />}
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
