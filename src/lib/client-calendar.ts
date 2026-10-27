import { supabase } from "./supabase";

export const fetchCalendarSecret = async (renew = false) => {
  const { data, error } = await supabase.rpc("get_calendar_secret", { renew });

  if (error) throw error;

  return data;
};
