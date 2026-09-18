import { useEffect, useRef, useState } from "react";
import { albums } from "@/data/albums";
import { PlayerProvider, usePlayer } from "@/player/PlayerContext";
import { useIsMobile } from "@/hooks/useIsMobile";
import { PAGE_TRANSITION_MS } from "@/lib/motion";
import { Header } from "@/components/Header";
import { GlobalPlayerBar } from "@/components/GlobalPlayerBar";
import { MobileTransportBar } from "@/components/MobileTransportBar";
import { AlbumLibrary } from "@/components/AlbumLibrary";
import { FocusedAlbum, BackToLibrary } from "@/components/FocusedAlbum";

type View = { screen: "library" } | { screen: "focused"; albumId: string };

// Drives the library<->detail page transition (see AlbumLibrary's
// sunk/navEase/onTop props and FocusedAlbum's navPhase prop): which album is
// involved, and which way. `view` itself flips the instant the transition
// starts — this only controls how long Stage keeps FocusedAlbum mounted so
// its slide/fade can overlap the library's own slide/fade instead of
// hard-cutting.
type NavTransition = { albumId: string; direction: "toFocused" | "toLibrary" } | null;

function Stage({
  view,
  navTransition,
  onSelect,
  onBack,
  isMobile,
}: {
  view: View;
  navTransition: NavTransition;
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

  // AlbumLibrary is always mounted — never unmounted while the detail view
  // is open — so its carousel scroll position, loaded cover-art window, and
  // hover state all survive a round trip into the detail view and back
  // instead of resetting on every remount.
  const focusedAlbumId = view.screen === "focused" ? view.albumId : navTransition?.albumId;
  const focusedMounted = view.screen === "focused" || navTransition !== null;
  const focusedAlbum = focusedAlbumId ? albums.find((a) => a.id === focusedAlbumId) : undefined;

  // Drives the library's own sink: true for the view's entire open duration
  // (not just mid-transition), and — unlike focusedAlbumId above — flips the
  // instant `view` itself changes rather than lingering through Back's own
  // exit window, so the library starts rising in the same tick the detail
  // view starts falling away instead of only once its exit finishes.
  const librarySunk = view.screen === "focused";

  // Both sides of the transition move in lockstep, opposite directions: the
  // library sinks away while the detail view rises in, and rises back while
  // the detail view sinks away.
  const navEase = navTransition?.direction === "toFocused" ? "in" : "out";
  const detailPhase = navTransition && (navTransition.direction === "toFocused" ? "entering" : "exiting");
  // Only while Back is actively in flight does the library need to be
  // briefly elevated above the (still exiting) detail view — see
  // AlbumLibrary's `onTop` prop doc.
  const libraryOnTop = navTransition?.direction === "toLibrary";

  return (
    <>
      <AlbumLibrary
        onSelect={onSelect}
        onPlay={handlePlay}
        sunk={librarySunk}
        navEase={navEase}
        onTop={libraryOnTop}
      />
      {focusedMounted && focusedAlbum && (
        <FocusedAlbum album={focusedAlbum} onBack={onBack} isMobile={isMobile} navPhase={detailPhase} />
      )}
    </>
  );
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
  const [navTransition, setNavTransition] = useState<NavTransition>(null);
  const navTransitionTimeout = useRef<number | null>(null);
  const isMobile = useIsMobile();

  useEffect(
    () => () => {
      if (navTransitionTimeout.current != null) window.clearTimeout(navTransitionTimeout.current);
    },
    []
  );

  const onBack = () => {
    // Only a real focused->library crossing gets the sleeve/detail
    // transition; a transition already in flight is left to finish rather
    // than restarted underneath itself.
    if (view.screen !== "focused" || navTransition) return;
    const albumId = view.albumId;
    setNavTransition({ albumId, direction: "toLibrary" });
    setView({ screen: "library" });
    navTransitionTimeout.current = window.setTimeout(() => setNavTransition(null), PAGE_TRANSITION_MS);
  };

  const onSelect = (albumId: string) => {
    if (navTransition) return;
    // Jumping straight between two already-focused albums (e.g. the header's
    // "Now Playing" shortcut) isn't a library<->detail crossing — swap
    // instantly, same as before this transition existed.
    if (view.screen === "focused") {
      if (view.albumId !== albumId) setView({ screen: "focused", albumId });
      return;
    }
    setNavTransition({ albumId, direction: "toFocused" });
    setView({ screen: "focused", albumId });
    navTransitionTimeout.current = window.setTimeout(() => setNavTransition(null), PAGE_TRANSITION_MS);
  };

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
      <Stage view={view} navTransition={navTransition} onSelect={onSelect} onBack={onBack} isMobile={isMobile} />

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
