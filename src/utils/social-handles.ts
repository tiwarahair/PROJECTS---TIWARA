// stylists enter only their username; the links are built here
export type SocialPlatform = "instagram" | "tiktok" | "youtube";

interface SocialRule {
  name: string;
  pattern: RegExp;
  minLength: number;
  maxLength: number;
  characters: string;
  getUrl: (handle: string) => string;
}

const SOCIAL_RULES: Record<SocialPlatform, SocialRule> = {
  instagram: {
    name: "Instagram",
    pattern: /^[a-z0-9._]+$/i,
    minLength: 1,
    maxLength: 30,
    characters: "letters, numbers, full stops and underscores",
    getUrl: (handle) => `https://www.instagram.com/${handle}`,
  },
  tiktok: {
    name: "TikTok",
    pattern: /^[a-z0-9._]+$/i,
    minLength: 2,
    maxLength: 24,
    characters: "letters, numbers, full stops and underscores",
    getUrl: (handle) => `https://www.tiktok.com/@${handle}`,
  },
  youtube: {
    name: "YouTube",
    pattern: /^[a-z0-9._-]+$/i,
    minLength: 3,
    maxLength: 30,
    characters: "letters, numbers, full stops, hyphens and underscores",
    getUrl: (handle) => `https://www.youtube.com/@${handle}`,
  },
};

const LINK_PATTERN = /[/:]|www\.|(instagram|tiktok|youtube)\.com|youtu\.be/i;

/** Why a typed username can't be saved, or "" when it can (blank is fine). */
export const getSocialHandleError = (
  platform: SocialPlatform,
  value: string,
): string => {
  const handle = value.trim();

  if (!handle) return "";

  const { name, pattern, minLength, maxLength, characters } =
    SOCIAL_RULES[platform];

  if (LINK_PATTERN.test(handle))
    return `Enter just your ${name} username, not a link`;

  if (handle.startsWith("@")) return "Leave out the @, just your username";

  if (!pattern.test(handle)) return `${name} usernames only use ${characters}`;

  if (handle.length < minLength || handle.length > maxLength)
    return `${name} usernames are ${minLength}–${maxLength} characters`;

  if (platform !== "youtube" && handle.endsWith("."))
    return `${name} usernames can’t end with a full stop`;

  if (
    platform === "instagram" &&
    (handle.startsWith(".") || handle.includes(".."))
  )
    return "Instagram usernames can’t start with a full stop or have two in a row";

  return "";
};

/** The profile link for a saved username, or "" when there isn't one. */
export const getSocialUrl = (
  platform: SocialPlatform,
  handle: string | null | undefined,
): string => {
  const trimmed = handle?.trim() ?? "";

  return trimmed ? SOCIAL_RULES[platform].getUrl(trimmed) : "";
};
