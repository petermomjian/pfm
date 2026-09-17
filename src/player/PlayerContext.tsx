import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { albums, type Album, type Track } from "@/data/albums";

interface PlayerState {
  album: Album | null;
  track: Track | null;
  isPlaying: boolean;
  isAudioPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
}

interface PlayerContextValue extends PlayerState {
  playTrack: (albumId: string, trackId: string) => void;
  togglePlay: () => void;
  next: () => void;
  prev: () => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

function coverArtMimeType(src: string): string {
  const ext = src.split(".").pop()?.toLowerCase().split(/[?#]/)[0];
  switch (ext) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "webp":
      return "image/webp";
    default:
      return "image/png";
  }
}

function findTrack(albumId: string, trackId: string) {
  const album = albums.find((a) => a.id === albumId) ?? null;
  const track = album?.tracks.find((t) => t.id === trackId) ?? null;
  return { album, track };
}

export function PlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [album, setAlbum] = useState<Album | null>(null);
  const [track, setTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.8);
  const [muted, setMuted] = useState(false);
  const previousVolumeRef = useRef(0.8);
  const isMuted = muted || volume === 0;

  // Set whenever one track hands off to another (auto-advance, Next/Prev, or
  // picking a different track) while the platter was already spinning, so
  // the transient pause/waiting/stalled events that swapping `src` produces
  // don't read as a real stop. Only genuine play/pause from the transport
  // controls should be visible as a ramp up/down.
  const isAdvancingRef = useRef(false);

  useEffect(() => {
    const audio = new Audio();
    audio.volume = volume;
    audioRef.current = audio;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => setDuration(audio.duration || 0);
    const onEnded = () => {
      if (hasNextTrackRef.current) {
        isAdvancingRef.current = true;
      } else {
        setIsAudioPlaying(false);
        setIsPlaying(false);
      }
      nextRef.current();
    };
    const onPlaying = () => {
      isAdvancingRef.current = false;
      setIsAudioPlaying(true);
    };
    const onFrozen = () => {
      // A track finishing naturally fires `pause` (with `ended` already true)
      // before the `ended` event itself, i.e. before onEnded below has had a
      // chance to raise isAdvancingRef — check the same "about to auto-
      // advance" condition here too, or this pause reads as a real stop.
      if (isAdvancingRef.current) return;
      if (audio.ended && hasNextTrackRef.current) return;
      setIsAudioPlaying(false);
    };
    const onError = () => {
      isAdvancingRef.current = false;
      setIsAudioPlaying(false);
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("playing", onPlaying);
    audio.addEventListener("pause", onFrozen);
    audio.addEventListener("waiting", onFrozen);
    audio.addEventListener("stalled", onFrozen);
    audio.addEventListener("error", onError);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("playing", onPlaying);
      audio.removeEventListener("pause", onFrozen);
      audio.removeEventListener("waiting", onFrozen);
      audio.removeEventListener("stalled", onFrozen);
      audio.removeEventListener("error", onError);
      audio.pause();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // iOS Safari ignores script writes to `.volume` (hardware volume buttons
  // are the only control) — `.muted` is the only reliable way to silence
  // playback on that platform, so mute state is applied through it directly
  // rather than by zeroing `.volume`.
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) audio.muted = isMuted;
  }, [isMuted]);

  // The native `timeupdate` event fires only a handful of times per second,
  // which reads as visible steps in the seek bar's position and label —
  // not a smooth slide. Drive the displayed time from a rAF loop instead,
  // synced to actual audio playback (not the transport's `isPlaying` intent)
  // so it doesn't advance while paused/buffering.
  useEffect(() => {
    if (!isAudioPlaying) return;
    let rafId: number;
    const tick = () => {
      const audio = audioRef.current;
      if (audio) setCurrentTime(audio.currentTime);
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isAudioPlaying]);

  const playTrack = useCallback((albumId: string, trackId: string) => {
    const { album: nextAlbum, track: nextTrack } = findTrack(albumId, trackId);
    const audio = audioRef.current;
    if (!nextAlbum || !nextTrack || !audio) return;
    if (!audio.paused) isAdvancingRef.current = true;
    setAlbum(nextAlbum);
    setTrack(nextTrack);
    audio.src = nextTrack.src;
    audio.currentTime = 0;
    audio.play();
    setIsPlaying(true);
  }, []);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !track) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play();
      setIsPlaying(true);
    }
  }, [isPlaying, track]);

  const advance = useCallback(
    (direction: 1 | -1) => {
      if (!album || !track) return;
      const currentIndex = album.tracks.findIndex((t) => t.id === track.id);
      const nextIndex = currentIndex + direction;
      const nextTrack = album.tracks[nextIndex];
      if (nextTrack) {
        playTrack(album.id, nextTrack.id);
      }
    },
    [album, track, playTrack],
  );

  const next = useCallback(() => advance(1), [advance]);
  const prev = useCallback(() => advance(-1), [advance]);

  const nextRef = useRef(next);
  useEffect(() => {
    nextRef.current = next;
  }, [next]);

  const hasNextTrackRef = useRef(false);
  useEffect(() => {
    hasNextTrackRef.current = Boolean(
      album && track && album.tracks.findIndex((t) => t.id === track.id) < album.tracks.length - 1,
    );
  }, [album, track]);

  // Scrubbing fires far more `input` events than the audio element can actually seek to per
  // second — writing `currentTime` on every one of them is what made dragging feel choppy.
  // The displayed position still updates every event (instant, cheap); only the real decoder
  // seek is coalesced to once per frame.
  const pendingSeekRef = useRef<number | null>(null);
  const seekRafRef = useRef<number | null>(null);
  useEffect(() => {
    return () => {
      if (seekRafRef.current != null) cancelAnimationFrame(seekRafRef.current);
    };
  }, []);

  // Holding the native range thumb (or an arrow key) at the far edge repeatedly
  // maps to the track's max, i.e. its duration — and the browser fires `ended`
  // the instant `currentTime` reaches `duration`. That advances to the next
  // track mid-drag, which the still-held pointer/key immediately re-triggers
  // against the new track's (shorter) max, cascading through the whole album.
  // Clamping just shy of the end lets a manual scrub approach but never reach
  // the exact end, so only real playback completion fires `ended`.
  const durationRef = useRef(0);
  useEffect(() => {
    durationRef.current = duration;
  }, [duration]);

  const seek = useCallback((time: number) => {
    const dur = durationRef.current;
    const clamped = dur > 0 ? Math.min(time, Math.max(0, dur - 0.15)) : time;
    setCurrentTime(clamped);
    pendingSeekRef.current = clamped;
    if (seekRafRef.current == null) {
      seekRafRef.current = requestAnimationFrame(() => {
        seekRafRef.current = null;
        const audio = audioRef.current;
        if (audio && pendingSeekRef.current != null) {
          audio.currentTime = pendingSeekRef.current;
        }
      });
    }
  }, []);

  // iOS/Android lock-screen and Control Center now-playing card: cover art,
  // title, and artist come from the current track, and the native transport
  // buttons there call back into the same play/pause/next/prev/seek used
  // in-app. There's no OS surface for a full tracklist — lock screens only
  // ever show the single now-playing track's metadata.
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    if (!album || !track) {
      navigator.mediaSession.metadata = null;
      return;
    }
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title,
      artist: album.artist,
      album: album.title,
      artwork: [{ src: album.coverArt, sizes: "512x512", type: coverArtMimeType(album.coverArt) }],
    });
  }, [album, track]);

  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
  }, [isPlaying]);

  const togglePlayRef = useRef(togglePlay);
  useEffect(() => {
    togglePlayRef.current = togglePlay;
  }, [togglePlay]);
  const prevRef = useRef(prev);
  useEffect(() => {
    prevRef.current = prev;
  }, [prev]);
  const seekRef = useRef(seek);
  useEffect(() => {
    seekRef.current = seek;
  }, [seek]);

  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    const session = navigator.mediaSession;
    session.setActionHandler("play", () => togglePlayRef.current());
    session.setActionHandler("pause", () => togglePlayRef.current());
    session.setActionHandler("previoustrack", () => prevRef.current());
    session.setActionHandler("nexttrack", () => nextRef.current());
    session.setActionHandler("seekto", (details) => {
      if (details.seekTime != null) seekRef.current(details.seekTime);
    });
    return () => {
      session.setActionHandler("play", null);
      session.setActionHandler("pause", null);
      session.setActionHandler("previoustrack", null);
      session.setActionHandler("nexttrack", null);
      session.setActionHandler("seekto", null);
    };
  }, []);

  // Keeps the lock screen's scrub bar in sync with actual playback. Polled on
  // an interval rather than every rAF tick (like the in-app seek bar) since
  // OS chrome only needs roughly-live position, not frame-perfect motion.
  useEffect(() => {
    if (!("mediaSession" in navigator) || !navigator.mediaSession.setPositionState) return;
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const updatePosition = () => {
      navigator.mediaSession.setPositionState({
        duration,
        position: Math.min(audio.currentTime, duration),
        playbackRate: audio.playbackRate,
      });
    };
    updatePosition();
    if (!isAudioPlaying) return;
    const intervalId = window.setInterval(updatePosition, 1000);
    return () => window.clearInterval(intervalId);
  }, [duration, isAudioPlaying, track]);

  const setVolume = useCallback((next: number) => {
    if (!audioRef.current) return;
    audioRef.current.volume = next;
    setVolumeState(next);
    if (next > 0) previousVolumeRef.current = next;
  }, []);

  const toggleMute = useCallback(() => {
    if (!audioRef.current) return;
    if (isMuted) {
      setMuted(false);
      if (volume === 0) setVolume(previousVolumeRef.current || 0.8);
    } else {
      setMuted(true);
    }
  }, [isMuted, volume, setVolume]);

  const value = useMemo<PlayerContextValue>(
    () => ({
      album,
      track,
      isPlaying,
      isAudioPlaying,
      currentTime,
      duration,
      volume,
      isMuted,
      playTrack,
      togglePlay,
      next,
      prev,
      seek,
      setVolume,
      toggleMute,
    }),
    [
      album,
      track,
      isPlaying,
      isAudioPlaying,
      currentTime,
      duration,
      volume,
      isMuted,
      playTrack,
      togglePlay,
      next,
      prev,
      seek,
      setVolume,
      toggleMute,
    ],
  );

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used within a PlayerProvider");
  return ctx;
}
