import { useEffect, useState } from "react";
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

// Elements that already own arrow/space/etc. themselves (range inputs, buttons,
// text inputs) — global shortcuts back off so they don't double-fire alongside
// (or fight) the element's native key handling.
function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  return ["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(target.tagName);
}

const SEEK_STEP_SECONDS = 5;
const VOLUME_STEP = 0.1;

function AppShell() {
  const [view, setView] = useState<View>({ screen: "library" });
  const isMobile = useIsMobile();
  const onBack = () => setView({ screen: "library" });
  const onSelect = (albumId: string) => setView({ screen: "focused", albumId });

  const focusedAlbum = view.screen === "focused" ? albums.find((a) => a.id === view.albumId) : undefined;

  const { track, currentTime, volume, togglePlay, next, prev, seek, setVolume, toggleMute } = usePlayer();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;

      switch (e.key) {
        case " ":
        case "Spacebar":
          e.preventDefault();
          togglePlay();
          break;
        case "Escape":
          if (view.screen === "focused") onBack();
          break;
        case "ArrowRight":
          if (track) {
            e.preventDefault();
            seek(currentTime + SEEK_STEP_SECONDS);
          }
          break;
        case "ArrowLeft":
          if (track) {
            e.preventDefault();
            seek(currentTime - SEEK_STEP_SECONDS);
          }
          break;
        case "ArrowUp":
          e.preventDefault();
          setVolume(Math.min(1, volume + VOLUME_STEP));
          break;
        case "ArrowDown":
          e.preventDefault();
          setVolume(Math.max(0, volume - VOLUME_STEP));
          break;
        case "m":
        case "M":
          toggleMute();
          break;
        case "n":
        case "N":
          if (track) next();
          break;
        case "p":
        case "P":
          if (track) prev();
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [view.screen, track, currentTime, volume, togglePlay, next, prev, seek, setVolume, toggleMute]);

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
            <Header onSelectAlbum={onSelect} isFocused={Boolean(focusedAlbum)} onBack={onBack} />
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
