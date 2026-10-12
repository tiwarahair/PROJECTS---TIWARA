// URL "board" switches read by the shared favourites/account/search helpers (prototype tw-fav.js).
// login=1 · guest=1 · favs=id,id · favtoast=saved|removed|copied · favsheet=1 · acctmenu=1 · lastsearch=<url> · board=true
export const getSearchParams = (): URLSearchParams =>
  new URLSearchParams(window.location.search);

/** Board/fixture views never persist anything to session storage. */
export const isBoardView = (params = getSearchParams()): boolean =>
  params.get("board") === "true" ||
  params.has("fixture") ||
  params.has("favs") ||
  params.has("favtoast") ||
  params.has("favsheet");

export const readSession = (key: string): string | null => {
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
};

/** sessionStorage write that is a no-op on board views; null removes the key. */
export const writeSession = (key: string, value: string | null): void => {
  if (isBoardView()) return;

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
