// URL and sessionStorage helpers shared by the favourites, account and search helpers.
export const getSearchParams = (
  search: string = window.location.search,
): URLSearchParams => new URLSearchParams(search);

export const readSession = (key: string): string | null => {
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
};

/** sessionStorage write; null removes the key. */
export const writeSession = (key: string, value: string | null): void => {
  try {
    if (value == null) window.sessionStorage.removeItem(key);
    else window.sessionStorage.setItem(key, value);
  } catch {
    // storage unavailable
  }
};

export const prefersReducedMotion = (): boolean =>
  !!window.matchMedia &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;
