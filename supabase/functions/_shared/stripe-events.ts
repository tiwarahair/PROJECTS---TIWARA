import { admin } from "./admin.ts";

export const isHandled = async (eventId: string) => {
  const { data } = await admin.from("stripe_events").select("id").eq("id", eventId).maybeSingle();

  return !!data;
};

export const markHandled = (eventId: string, type: string) => admin.from("stripe_events").insert({ id: eventId, type });
