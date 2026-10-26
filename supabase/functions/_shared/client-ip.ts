/** Cloudflare's header can't be set by the caller; X-Forwarded-For can, so it's only the local fallback. */
export const getClientIp = ({ headers }: Request) =>
  headers.get("cf-connecting-ip") ?? headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
