import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { SITE_NAME } from "@/config";
import { Logo } from "@/components/icons/Logo";
import { VinylMark } from "@/components/VinylMark";
import { usePlayer } from "@/player/PlayerContext";
import { TRACK_SWAP_TRANSITION } from "@/lib/motion";

export function Header() {
  const { track, isAudioPlaying } = usePlayer();
  const reduceMotion = useReducedMotion();

  return (
    <div className="flex w-full items-center justify-between pointer-events-auto md:h-[var(--pfm-chrome-row-h)]">
      <Logo height={32} className="pfm-fluid h-6 w-auto md:h-8" role="img" aria-label={SITE_NAME} />

      <div className="hidden items-center gap-4 md:flex">
        <div className="flex flex-col items-end justify-center gap-0.5 text-sm w-28 min-w-0 shrink-0">
          {track ? (
            <>
              <span className="text-muted">Now Playing</span>
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
            </>
          ) : (
            <span className="text-muted">Nothing Playing</span>
          )}
        </div>
        <VinylMark size={80} spinning={isAudioPlaying} flat={!track} />
      </div>
    </div>
  );
}
