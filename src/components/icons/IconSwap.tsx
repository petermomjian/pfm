import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import { ICON_SWAP_TRANSITION } from "@/lib/motion";

interface IconSwapProps {
  /** Identifies which icon is currently shown; changing it triggers the crossfade. */
  id: string;
  size: number;
  children: ReactNode;
  /** "full" crossfades opacity, scale and blur; "opacity" fades opacity only. */
  effect?: "full" | "opacity";
  /** Scale the swapped-out/in icon starts and ends at (only used by the "full" effect). */
  scale?: number;
  /** Blur radius in px at the start/end of the swap (only used by the "full" effect). */
  blur?: number;
}

// Crossfades between contextually-swapped icons (e.g. play/pause, volume level)
// instead of an abrupt pop, per https://x.com/jakubkrehel/status/1955311846337954166.
export function IconSwap({ id, size, children, effect = "full", scale = 0.6, blur = 4 }: IconSwapProps) {
  const reduceMotion = useReducedMotion();
  const isFull = effect === "full" && !reduceMotion;

  const hiddenState = isFull ? { opacity: 0, scale, filter: `blur(${blur}px)` } : { opacity: 0 };
  const shownState = isFull ? { opacity: 1, scale: 1, filter: "blur(0px)" } : { opacity: 1 };

  return (
    <span className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          key={id}
          className="absolute inset-0 flex items-center justify-center"
          style={{ willChange: isFull ? "filter" : "opacity" }}
          initial={reduceMotion ? false : hiddenState}
          animate={shownState}
          exit={hiddenState}
          transition={reduceMotion ? { duration: 0.1 } : ICON_SWAP_TRANSITION}
        >
          {children}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
