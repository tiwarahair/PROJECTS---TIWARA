import { admin } from "./admin.ts";

export const isWithinLimit = async (key: string, maxHits: number, windowSeconds: number) => {
  const { data, error } = await admin.rpc("hit_rate_limit", {
    limit_key: key,
    max_hits: maxHits,
    window_seconds: windowSeconds,
  });

  if (error) throw error;

  return data === true;
};
