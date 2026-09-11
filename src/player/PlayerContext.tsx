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
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    const audio = new Audio();
    audio.volume = volume;
    audioRef.current = audio;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => setDuration(audio.duration || 0);
    const onEnded = () => nextRef.current();

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("ended", onEnded);
      audio.pause();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const playTrack = useCallback((albumId: string, trackId: string) => {
    const { album: nextAlbum, track: nextTrack } = findTrack(albumId, trackId);
    if (!nextAlbum || !nextTrack || !audioRef.current) return;
    setAlbum(nextAlbum);
    setTrack(nextTrack);
    audioRef.current.src = nextTrack.src;
    audioRef.current.currentTime = 0;
    audioRef.current.play();
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

  const seek = useCallback((time: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = time;
    setCurrentTime(time);
  }, []);

  const setVolume = useCallback((next: number) => {
    if (!audioRef.current) return;
    audioRef.current.volume = next;
    audioRef.current.muted = false;
    setVolumeState(next);
    setIsMuted(false);
  }, []);

  const toggleMute = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = !audio.muted;
    setIsMuted(audio.muted);
  }, []);

  const value = useMemo<PlayerContextValue>(
    () => ({
      album,
      track,
      isPlaying,
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
