export interface Track {
  id: string;
  index: number;
  title: string;
  duration: number; // seconds — placeholder only; real playback reads live duration from the audio element
  src: string;
}

export interface Album {
  id: string;
  title: string;
  artist: string;
  coverArt: string;
  tracks: Track[];
}

const TARGET_ALBUM_COUNT = 12;
const DEFAULT_COVER = "/vinyl/cover-placeholder.png";

// Real albums are discovered from `src/assets/albums/<Artist> - <Album Title>/`
// folders — drop a `cover.*` image and the track mp3s in there and the album
// appears with no code changes. See src/assets/albums/README.md.
const coverFiles = import.meta.glob<string>("/src/assets/albums/*/cover.*", {
  eager: true,
  import: "default",
  query: "?url",
});
const trackFiles = import.meta.glob<string>("/src/assets/albums/*/*.mp3", {
  eager: true,
  import: "default",
  query: "?url",
});

function folderName(path: string): string {
  return path.match(/\/albums\/([^/]+)\//)?.[1] ?? path;
}

function fileName(path: string): string {
  return path.slice(path.lastIndexOf("/") + 1);
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

// Folder name convention is "<Artist> - <Album Title>"; a folder without a
// " - " separator is treated as just the title.
function parseFolderName(folder: string): { title: string; artist: string } {
  const separatorIndex = folder.indexOf(" - ");
  if (separatorIndex === -1) return { title: folder, artist: "Unknown Artist" };
  return {
    artist: folder.slice(0, separatorIndex).trim(),
    title: folder.slice(separatorIndex + 3).trim(),
  };
}

// Strips a leading track-number prefix ("01 ", "01 - ", "01.") so filenames
// like "01 Night Drive.mp3" display as "Night Drive".
function trackTitleFromFilename(filename: string): string {
  const withoutExt = filename.replace(/\.mp3$/i, "");
  const withoutIndex = withoutExt.replace(/^\d+[\s._-]*/, "").trim();
  return withoutIndex || withoutExt;
}

function discoverRealAlbums(): Album[] {
  const byFolder = new Map<string, { cover?: string; tracks: { file: string; url: string }[] }>();

  for (const [path, url] of Object.entries(coverFiles)) {
    const folder = folderName(path);
    const entry = byFolder.get(folder) ?? { tracks: [] };
    entry.cover = url;
    byFolder.set(folder, entry);
  }
  for (const [path, url] of Object.entries(trackFiles)) {
    const folder = folderName(path);
    const entry = byFolder.get(folder) ?? { tracks: [] };
    entry.tracks.push({ file: fileName(path), url });
    byFolder.set(folder, entry);
  }

  return Array.from(byFolder.entries())
    .filter(([, entry]) => entry.tracks.length > 0)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([folder, entry]) => {
      const { title, artist } = parseFolderName(folder);
      const id = slugify(folder);
      const tracks = entry.tracks
        .sort((a, b) => a.file.localeCompare(b.file, undefined, { numeric: true }))
        .map((track, trackIndex) => ({
          id: `${id}-${trackIndex + 1}`,
          index: trackIndex + 1,
          title: trackTitleFromFilename(track.file),
          duration: 0,
          src: track.url,
        }));
      return { id, title, artist, coverArt: entry.cover ?? DEFAULT_COVER, tracks };
    });
}

// Placeholder content fills out the library up to TARGET_ALBUM_COUNT so the
// app stays fully populated while real albums are added one at a time.
const TONE_FILES = [
  "tone-1.wav",
  "tone-2.wav",
  "tone-3.wav",
  "tone-4.wav",
  "tone-5.wav",
  "tone-6.wav",
];
const TRACK_COUNTS = [8, 10, 6, 12, 9, 7, 11, 8, 10, 6, 9, 8];

function placeholderTrack(albumIndex: number, trackIndex: number): Track {
  const toneFile = TONE_FILES[(albumIndex + trackIndex) % TONE_FILES.length];
  return {
    id: `placeholder-${albumIndex}-track-${trackIndex}`,
    index: trackIndex + 1,
    title: `Track ${trackIndex + 1}`,
    duration: 6,
    src: `/audio/${toneFile}`,
  };
}

function placeholderAlbum(albumIndex: number): Album {
  const trackCount = TRACK_COUNTS[albumIndex % TRACK_COUNTS.length];
  return {
    id: `placeholder-album-${albumIndex}`,
    title: `Album Title ${albumIndex + 1}`,
    artist: `Artist ${albumIndex + 1}`,
    coverArt: DEFAULT_COVER,
    tracks: Array.from({ length: trackCount }, (_, trackIndex) =>
      placeholderTrack(albumIndex, trackIndex),
    ),
  };
}

const realAlbums = discoverRealAlbums();
const placeholderCount = Math.max(0, TARGET_ALBUM_COUNT - realAlbums.length);

export const albums: Album[] = [
  ...realAlbums,
  ...Array.from({ length: placeholderCount }, (_, i) => placeholderAlbum(i)),
];
