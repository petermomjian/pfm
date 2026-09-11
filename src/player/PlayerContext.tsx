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
  const previousVolumeRef = useRef(0.8);
  const isMuted = volume === 0;

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

  const seek = useCallback((time: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = time;
    setCurrentTime(time);
  }, []);

  const setVolume = useCallback((next: number) => {
    if (!audioRef.current) return;
    audioRef.current.volume = next;
    setVolumeState(next);
    if (next > 0) previousVolumeRef.current = next;
  }, []);

  const toggleMute = useCallback(() => {
    if (!audioRef.current) return;
    if (volume > 0) {
      previousVolumeRef.current = volume;
      setVolume(0);
    } else {
      setVolume(previousVolumeRef.current || 0.8);
    }
  }, [volume, setVolume]);

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
