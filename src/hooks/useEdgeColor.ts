import { useEffect, useState } from "react";
import { getCachedEdgeColor, getEdgeColor } from "@/lib/edgeColor";

/**
 * Resolves to `fallback` immediately (or an already-cached result, avoiding a
 * flash), then swaps in the artwork's sampled edge color once decoding and
 * sampling finish — or stays on `fallback` if extraction fails.
 */
export function useEdgeColor(src: string | undefined, fallback: string): string {
  const [color, setColor] = useState(() => (src && getCachedEdgeColor(src)) || fallback);

  useEffect(() => {
    if (!src) {
      setColor(fallback);
      return;
    }

    const cached = getCachedEdgeColor(src);
    if (cached) {
      setColor(cached);
      return;
    }

    let cancelled = false;
    getEdgeColor(src)
      .then((result) => {
        if (!cancelled) setColor(result);
      })
      .catch(() => {
        if (!cancelled) setColor(fallback);
      });
    return () => {
      cancelled = true;
    };
  }, [src, fallback]);

  return color;
}
