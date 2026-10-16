export const DAY_PX = 128;
export const WEEK_PX = 88;
export const END_HOUR = 24;
export const END_MINUTES = END_HOUR * 60;

export type EmptyKind = "new" | "filtered" | "past" | "upcoming";

export interface EmptyCopy {
  title: string;
  body: string;
}

export interface FilterOption {
  id: string;
  label: string;
}

export const EMPTY_COPY: Record<EmptyKind, EmptyCopy> = {
  new: {
    title: "No appointments yet",
    body: "Share your booking link to get your first one.",
  },
  filtered: {
    title: "Nothing matches",
    body: "Try a wider date range or clear the filters.",
  },
  past: {
    title: "No past appointments",
    body: "Completed appointments will appear here once the date has passed.",
  },
  upcoming: {
    title: "Nothing booked yet",
    body: "Add a booking yourself or leave your days open for online bookings.",
  },
};

export const DAY_NAMES: Record<number, string> = { 0: "Today", 1: "Tomorrow" };

export const RANGE_OPTIONS: FilterOption[] = [
  { id: "all", label: "All upcoming" },
  { id: "today", label: "Today" },
  { id: "7", label: "Next 7 days" },
  { id: "30", label: "Next 30 days" },
];

export const STATUS_OPTIONS: FilterOption[] = [
  { id: "all", label: "Any status" },
  { id: "awaiting", label: "Awaiting confirmation" },
  { id: "confirmed", label: "Confirmed" },
  { id: "arrived", label: "Arrived" },
];

export const PAY_OPTIONS: FilterOption[] = [
  { id: "any", label: "Any payment" },
  { id: "unpaid", label: "Deposit unpaid" },
  { id: "full", label: "Paid in full" },
];

export const PAST_STATUS_OPTIONS: FilterOption[] = [
  { id: "all", label: "All" },
  { id: "completed", label: "Completed" },
  { id: "cancelled", label: "Cancelled" },
  { id: "noshow", label: "No show" },
  { id: "failed", label: "Payment failed" },
];

export const POP_SIZE = { width: 236, height: 132, pad: 12 };
