// allergies or sensitivities a signed-in client shares with each stylist they've booked
import type { SharedSensitivity } from "../types/sensitivity";
import { supabase } from "./supabase";

interface SensitivityRow {
  stylist_id: string;
  stylist_name: string;
  text: string | null;
}

const isSensitivityRows = (value: unknown): value is SensitivityRow[] =>
  Array.isArray(value);

export const fetchMySensitivities = async (): Promise<SharedSensitivity[]> => {
  const { data, error } = await supabase.rpc("get_my_sensitivities");

  if (error) throw error;

  if (!isSensitivityRows(data)) return [];

  return data.map(
    ({ stylist_id: stylistId, stylist_name: stylistName, text }) => ({
      stylistId,
      stylistName,
      text: text ?? "",
    }),
  );
};

export const fetchMySensitivity = async (stylistSlug: string) => {
  const { data, error } = await supabase.rpc("get_my_sensitivity", {
    stylist_slug: stylistSlug,
  });

  if (error) throw error;

  return data ?? "";
};

export const saveMySensitivity = async ({
  stylistId,
  text,
}: {
  stylistId: string;
  text: string;
}) => {
  const { error } = await supabase.rpc("save_my_sensitivity", {
    target_stylist: stylistId,
    sensitivity: text,
  });

  if (error) throw error;

  return null;
};
