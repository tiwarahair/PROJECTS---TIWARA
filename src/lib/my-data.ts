import { readAccountPhoto } from "./account-photo";
import { fetchClientCards } from "./client-cards";
import { supabase } from "./supabase";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const CARDS_MISSING =
  "Your saved cards couldn’t be loaded this time. Download your data again to include them.";

export const fetchMyData = async (userId: string) => {
  const [{ data, error }, cards] = await Promise.all([
    supabase.rpc("get_my_data"),
    fetchClientCards().catch(() => null),
  ]);

  if (error) throw error;

  if (!isRecord(data) || !isRecord(data.profile)) throw new Error("no_data");

  const { profile, ...rest } = data;
  const { has_photo: hasPhoto, ...details } = profile;

  const photo = hasPhoto
    ? await readAccountPhoto(userId).catch(() => null)
    : null;

  return {
    ...rest,
    profile: { ...details, photo },
    saved_cards: cards
      ? cards.map(({ brand, last4, expiry, isDefault }) => ({
          brand,
          last4,
          expiry,
          is_default: isDefault,
        }))
      : CARDS_MISSING,
  };
};
