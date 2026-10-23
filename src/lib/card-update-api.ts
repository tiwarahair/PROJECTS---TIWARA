// The public update-card page: the booking whose saved card expires before the appointment, and saving a new one.
import { invokeBookingFunction } from "./booking-api";

export interface CardUpdate {
  state: "open" | "updated" | "expired" | "unavailable";
  ref: string;
  service_name: string;
  stylist_name: string;
  stylist_slug: string;
  starts_at: string;
  card_label: string | null;
  mode: "deposit" | "card";
}

export const fetchCardUpdate = (token: string) =>
  invokeBookingFunction<CardUpdate>("booking-card", { action: "view", token });

export const startCardUpdate = (token: string, turnstileToken: string) =>
  invokeBookingFunction<{ clientSecret: string }>("booking-card", {
    action: "start",
    token,
    turnstileToken,
  });

export const saveCardUpdate = (token: string) =>
  invokeBookingFunction<CardUpdate>("booking-card", { action: "save", token });
