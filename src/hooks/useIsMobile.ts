import { useEffect, useState } from "react";

// 767.98px (not 767px) matches Tailwind's own `max-md` convention — it
// closes the dead zone that sub-pixel layout (e.g. a fractional
// devicePixelRatio) can otherwise leave between this query and the `md:`
// (min-width: 768px) utilities used for the CSS-only half of this breakpoint.
const MOBILE_QUERY = "(max-width: 767.98px)";

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(() => window.matchMedia(MOBILE_QUERY).matches);

  useEffect(() => {
    const mql = window.matchMedia(MOBILE_QUERY);
    const onChange = () => setIsMobile(mql.matches);
    mql.addEventListener("change", onChange);
    // Belt-and-suspenders: a devtools/CDP-driven viewport change doesn't
    // always dispatch matchMedia's own "change" event, but it reliably fires
    // window "resize" — fall back to that so the breakpoint can't get stuck.
    window.addEventListener("resize", onChange);
    return () => {
      mql.removeEventListener("change", onChange);
      window.removeEventListener("resize", onChange);
    };
  }, []);

  return isMobile;
}
