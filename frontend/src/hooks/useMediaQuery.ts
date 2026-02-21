import { useState, useEffect } from "react";

/**
 * Returns true when screen width is below the given breakpoint.
 * Uses window.matchMedia for efficient listener-based updates.
 */
export function useMediaQuery(maxWidth: number): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth <= maxWidth : false
  );

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${maxWidth}px)`);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    setMatches(mql.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [maxWidth]);

  return matches;
}

/** Convenience: true when ≤ 768px */
export const useIsMobile = () => useMediaQuery(768);

/** Convenience: true when ≤ 1024px */
export const useIsTablet = () => useMediaQuery(1024);
