import { useRef, useState } from "react";
import { albums } from "@/data/albums";
import { PlayerProvider, usePlayer } from "@/player/PlayerContext";
import { Header } from "@/components/Header";
import { GlobalPlayerBar } from "@/components/GlobalPlayerBar";
import { AlbumLibrary, SLEEVE_SIZE } from "@/components/AlbumLibrary";
import { FocusedAlbum } from "@/components/FocusedAlbum";
import { VinylExtraction } from "@/components/VinylExtraction";

interface TransitionState {
  albumId: string;
  sleeveEl: HTMLDivElement;
}

function Stage({
  view,
  onSelect,
  onBack,
}: {
  view: { screen: "library" } | { screen: "focused"; albumId: string };
  onSelect: (albumId: string, sleeveEl: HTMLDivElement | null) => void;
  onBack: () => void;
}) {
  const { playTrack } = usePlayer();

  const handlePlay = (albumId: string, sleeveEl: HTMLDivElement | null) => {
    const album = albums.find((a) => a.id === albumId);
    const firstTrack = album?.tracks[0];
    if (album && firstTrack) playTrack(album.id, firstTrack.id);
    onSelect(albumId, sleeveEl);
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
  const [transition, setTransition] = useState<TransitionState | null>(null);
  const destinationVinylRef = useRef<HTMLDivElement | null>(null);

  const transitionAlbum = transition ? albums.find((a) => a.id === transition.albumId) : undefined;

  const handleSelect = (albumId: string, sleeveEl: HTMLDivElement | null) => {
    if (transition) return; // ignore re-entrant selection while one is already in flight
    if (!sleeveEl) {
      setView({ screen: "focused", albumId });
      return;
    }
    setTransition({ albumId, sleeveEl });
  };

  const finishTransition = () => {
    if (!transition) return;
    setView({ screen: "focused", albumId: transition.albumId });
    setTransition(null);
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-background text-foreground">
      <Stage view={view} onSelect={handleSelect} onBack={() => setView({ screen: "library" })} />

      {transitionAlbum && (
        <div className="absolute inset-0 opacity-0 pointer-events-none" aria-hidden>
          <FocusedAlbum album={transitionAlbum} onBack={() => {}} vinylRef={destinationVinylRef} />
        </div>
      )}

      {transition && (
        <VinylExtraction
          key={transition.albumId}
          sleeveEl={transition.sleeveEl}
          faceSize={SLEEVE_SIZE}
          destinationRef={destinationVinylRef}
          onComplete={finishTransition}
        />
      )}

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
