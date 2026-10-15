// Searching live stylists (search_stylists), a page at a time.
import type { Database } from "../types/database";
import { publicSupabase } from "./supabase";

type SearchFunction = Database["public"]["Functions"]["search_stylists"];

export type SearchArgs = Omit<SearchFunction["Args"], "page" | "page_size">;

type NullableColumns =
  "area_label" | "cover_path" | "distance_miles" | "next_start";

/** The generated type marks every returned column non-null; these can be null (no point: no distance). */
export type SearchRow = Omit<
  SearchFunction["Returns"][number],
  NullableColumns
> & {
  [Column in NullableColumns]: SearchFunction["Returns"][number][Column] | null;
};

export const SEARCH_PAGE_SIZE = 12;

export const searchStylists = async (
  args: SearchArgs,
  page = 0,
  pageSize = SEARCH_PAGE_SIZE,
): Promise<SearchRow[]> => {
  // the same for everyone: no need to wait on the visitor's login
  const { data, error } = await publicSupabase.rpc("search_stylists", {
    ...args,
    page,
    page_size: pageSize,
  });

  if (error) throw error;

  return data;
};
