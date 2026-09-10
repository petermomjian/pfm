export interface Track {
  id: string;
  index: number;
  title: string;
  duration: number; // seconds
  src: string;
}

export interface Album {
  id: string;
  title: string;
  artist: string;
  tracks: Track[];
}

const TONE_FILES = [
  "tone-1.wav",
  "tone-2.wav",
  "tone-3.wav",
  "tone-4.wav",
  "tone-5.wav",
  "tone-6.wav",
];

function placeholderTrack(albumIndex: number, trackIndex: number): Track {
  const toneFile = TONE_FILES[(albumIndex + trackIndex) % TONE_FILES.length];
  return {
    id: `album-${albumIndex}-track-${trackIndex}`,
    index: trackIndex + 1,
    title: `Track ${trackIndex + 1}`,
    duration: 6,
    src: `/audio/${toneFile}`,
  };
}

const TRACK_COUNTS = [8, 10, 6, 12, 9, 7, 11, 8, 10, 6, 9, 8];

export const albums: Album[] = TRACK_COUNTS.map((trackCount, albumIndex) => ({
  id: `album-${albumIndex}`,
  title: `Album Title ${albumIndex + 1}`,
  artist: `Artist ${albumIndex + 1}`,
  tracks: Array.from({ length: trackCount }, (_, trackIndex) =>
    placeholderTrack(albumIndex, trackIndex),
  ),
}));
