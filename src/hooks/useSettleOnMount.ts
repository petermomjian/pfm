import { useEffect, useState } from "react";

// Standard mount-triggered CSS transition helper. When `active` is true, the
// caller must render its "start" inline style on the very first paint
// (settled === false) — otherwise the browser has nothing to transition
// *from* and the element just snaps straight to its resting style. One frame
// after mount this flips to true, so the caller can swap to its resting
// style and the already-declared CSS transition actually plays.
//
// When `active` is false, returns true immediately — a no-op passthrough for
// elements that aren't entering (already at rest, or unmounting instead).
export function useSettleOnMount(active: boolean): boolean {
  const [settled, setSettled] = useState(!active);

  useEffect(() => {
    if (!active || settled) return;
    const frame = requestAnimationFrame(() => setSettled(true));
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  return settled;
}
