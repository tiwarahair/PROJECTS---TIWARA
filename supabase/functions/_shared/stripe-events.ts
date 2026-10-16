import { admin } from "./admin.ts";

// Stripe can send an event more than once; each is handled once.

export const isHandled = async (eventId: string) => {
  const { data } = await admin.from("stripe_events").select("id").eq("id", eventId).maybeSingle();

  return !!data;
};

export const markHandled = (eventId: string, type: string) =>
  admin.from("stripe_events").insert({ id: eventId, type });
