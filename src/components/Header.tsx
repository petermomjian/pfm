import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { SITE_NAME } from "@/config";
import { Logo } from "@/components/icons/Logo";
import { VinylMark } from "@/components/VinylMark";
import { usePlayer } from "@/player/PlayerContext";
import { TRACK_SWAP_TRANSITION } from "@/lib/motion";

interface HeaderProps {
  onSelectAlbum: (albumId: string) => void;
  isFocused: boolean;
  onBack: () => void;
}

export function Header({ onSelectAlbum, isFocused, onBack }: HeaderProps) {
  const { album, track, isAudioPlaying } = usePlayer();
  const reduceMotion = useReducedMotion();

  return (
    <div className="flex w-full items-center justify-between pointer-events-auto md:h-[var(--pfm-chrome-row-h)]">
      <button
        type="button"
        aria-label={isFocused ? "Back to library" : SITE_NAME}
        onClick={() => isFocused && onBack()}
        disabled={!isFocused}
        className="pfm-interactive hover:scale-[1.02] hover:opacity-80 active:scale-[0.98] active:opacity-60 focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_rgba(255,255,255,0.3)] disabled:pointer-events-none"
      >
        <Logo height={32} className="pfm-fluid h-6 w-auto md:h-8" aria-hidden="true" />
      </button>

      <button
        type="button"
        aria-label={album ? `Go to ${album.title}` : "Nothing playing"}
        onClick={() => album && onSelectAlbum(album.id)}
        disabled={!album}
        className="pfm-interactive group hidden items-center gap-4 hover:scale-105 hover:opacity-80 active:scale-95 active:opacity-60 focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_rgba(255,255,255,0.3)] disabled:pointer-events-none md:flex"
      >
        <div className="flex flex-col items-end justify-center gap-0.5 text-sm w-28 min-w-0 shrink-0">
          <AnimatePresence initial={false} mode="popLayout">
            {track ? (
              <motion.div
                key="playing"
                className="flex flex-col items-end gap-0.5"
                initial={reduceMotion ? false : { opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={reduceMotion ? { duration: 0.1 } : TRACK_SWAP_TRANSITION}
              >
                <span className="text-muted group-hover:text-foreground">Now Playing</span>
                <span className="relative h-5 w-full">
                  <AnimatePresence initial={false} mode="popLayout">
                    <motion.span
                      key={track.id}
                      className="absolute inset-x-0 top-0 truncate text-right"
                      initial={reduceMotion ? false : { opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={reduceMotion ? { duration: 0.1 } : TRACK_SWAP_TRANSITION}
                    >
                      {track.title}
                    </motion.span>
                  </AnimatePresence>
                </span>
              </motion.div>
            ) : (
              <motion.span
                key="empty"
                className="text-muted group-hover:text-foreground"
                initial={reduceMotion ? false : { opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={reduceMotion ? { duration: 0.1 } : TRACK_SWAP_TRANSITION}
              >
                Nothing Playing
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        <VinylMark size={80} spinning={isAudioPlaying} flat={!track} artworkSrc={album?.coverArtVinyl} />
      </button>
    </div>
  );
}
