// Shared with the CSS custom property --ease-out-subtle in index.css so
// CSS transitions and framer-motion animations feel like one system.
export const EASE_OUT_SUBTLE = [0.22, 1, 0.36, 1] as const;

export const ICON_SWAP_TRANSITION = { duration: 0.18, ease: EASE_OUT_SUBTLE };

// Slightly longer than the icon crossfade since it's swapping a full line of text.
export const TRACK_SWAP_TRANSITION = { duration: 0.22, ease: EASE_OUT_SUBTLE };

// Shared timing for the library<->detail page transition (see App.tsx's
// navTransition state, AlbumLibrary's sunk/navEase/onTop props, and
// FocusedAlbum's navPhase prop, all driven by index.css's
// --ease-page-transition on both the exiting and entering page alike). The
// exiting page and the entering page are NOT fully concurrent — running two
// large, partially-transparent full-page layers on top of each other for
// the whole duration read as a muddy double exposure. Instead the exit
// plays first, starting immediately (this is the transition's own starting
// point), and the entrance follows after a delay, overlapping only briefly
// at the handoff so the two still read as one continuous motion.
export const PAGE_EXIT_MS = 380;
export const PAGE_ENTER_DELAY_MS = 260; // leaves a ~120ms overlap with the exit
export const PAGE_ENTER_MS = 380;
// Total time App.tsx keeps both pages mounted for — the entrance is always
// the last thing to finish.
export const PAGE_TRANSITION_MS = PAGE_ENTER_DELAY_MS + PAGE_ENTER_MS;
export const PAGE_TRANSITION_DISTANCE = 64; // px — the detail view's own slide

// The library row's own sink (metadata + sleeves, moving together) is
// larger and, unlike the detail view's flat slide, genuinely travels
// through Z inside the sleeve scene's existing perspective — see
// AlbumLibrary's scene3dSinkStyle for how LIBRARY_SINK_DEPTH is paired with
// a compensating scale so the recede reads as real depth movement rather
// than the object visibly shrinking as it goes.
// Distance and depth are kept at roughly the same ratio to each other (were
// 260/380) so scaling them down together halves the perceived on-screen
// drop without changing the character of the recede — just the amount of it.
export const LIBRARY_SINK_DISTANCE = 109; // px, translateY
export const LIBRARY_SINK_DEPTH = 160; // px, translateZ magnitude
