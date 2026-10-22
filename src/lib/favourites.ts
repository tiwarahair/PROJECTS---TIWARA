import { supabase } from "./supabase";

export const fetchFavourites = async () => {
  const { data, error } = await supabase.rpc("get_my_favourites");

  if (error) throw error;

  return data;
};

export const writeFavourite = async (slug: string, saved: boolean) => {
  const { error } = await supabase.rpc("set_favourite", {
    stylist_slug: slug,
    saved,
  });

  if (error) throw error;
};
