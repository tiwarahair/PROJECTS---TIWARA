const SITES = ["https://dev.tiwarashouse.com", "https://tiwarashouse.com", "https://www.tiwarashouse.com"];

const LIVE_SITE = "https://www.tiwarashouse.com";

const isLocalSite = (origin: string) => /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);

export const getSite = (origin: string | null) => {
  if (origin && (SITES.includes(origin) || isLocalSite(origin))) return origin;

  return LIVE_SITE;
};
