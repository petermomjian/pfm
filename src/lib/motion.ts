// Shared with the CSS custom property --ease-out-subtle in index.css so
// CSS transitions and framer-motion animations feel like one system.
export const EASE_OUT_SUBTLE = [0.22, 1, 0.36, 1] as const;

export const ICON_SWAP_TRANSITION = { duration: 0.18, ease: EASE_OUT_SUBTLE };

// Slightly longer than the icon crossfade since it's swapping a full line of text.
export const TRACK_SWAP_TRANSITION = { duration: 0.22, ease: EASE_OUT_SUBTLE };
