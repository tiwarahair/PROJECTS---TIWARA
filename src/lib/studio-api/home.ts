import { z } from "zod";
import { supabase } from "../supabase";
import { check, write } from "./request";

const periodSchema = z.object({
  bookings: z.number(),
  booked_minutes: z.number(),
  open_minutes: z.number(),
  new_clients: z.number(),
  revenue_pence: z.number(),
});

const statsSchema = z.object({
  today: z.string(),
  current: periodSchema,
  previous: periodSchema,
  buckets: z.record(z.string(), z.number()),
});

export type HomePeriod = z.infer<typeof periodSchema>;
export type HomeStats = z.infer<typeof statsSchema>;

export interface ActivityRow {
  id: string;
  kind: string;
  at: string;
  booking_id: string | null;
  client_first: string | null;
  service: string | null;
  amount_pence: number | null;
  is_unread: boolean;
}

const ACTIVITY_ROWS = 30;

export const fetchHomeStats = async (stylistId: string, days: number) =>
  statsSchema.parse(
    await check(supabase.rpc("get_studio_kpis", { target: stylistId, days })),
  );

export const fetchStudioActivity = async (
  stylistId: string,
): Promise<ActivityRow[]> =>
  (await check(
    supabase.rpc("get_studio_activity", {
      target: stylistId,
      max_rows: ACTIVITY_ROWS,
    }),
  )) ?? [];

export const markActivitySeen = (stylistId: string, seenUntil: string) =>
  write(
    supabase.rpc("mark_activity_seen", {
      target: stylistId,
      seen_until: seenUntil,
    }),
  );
