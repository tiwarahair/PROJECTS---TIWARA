import type { AddOn, CalendarDay, TimeSlot } from "../types/booking";

// TO DO: HARDCODED FOR NOW, USE ACTUAL CALENDAR API*** WHEN AVAILABLE
export const CALENDAR_MONTH_LABEL = "July 2026";

export const CALENDAR_DAY_NAMES: readonly string[] = [
  "Mo",
  "Tu",
  "We",
  "Th",
  "Fr",
  "Sa",
  "Su",
];

const UNAVAILABLE_DAYS = new Set([3, 5, 6, 10, 12, 13, 17, 20, 24, 26, 27, 31]);
const TODAY = 11;
const DAYS_IN_MONTH = 31;

export const CALENDAR_DAYS: readonly CalendarDay[] = Array.from(
  { length: DAYS_IN_MONTH },
  (_unused, index) => {
    const day = index + 1;
    return {
      day,
      available: !UNAVAILABLE_DAYS.has(day),
      isToday: day === TODAY,
    };
  },
);

export const TIME_SLOTS: readonly TimeSlot[] = [
  { id: "0900", label: "9:00 am", taken: true },
  { id: "1030", label: "10:30 am", taken: false },
  { id: "1200", label: "12:00 pm", taken: true },
  { id: "1330", label: "1:30 pm", taken: false },
  { id: "1500", label: "3:00 pm", taken: false },
  { id: "1630", label: "4:30 pm", taken: false },
];

export const ADD_ONS: readonly AddOn[] = [
  { id: "boho", label: "Boho (curly pieces)", price: 15 },
  { id: "blowdry", label: "Blow dry", price: 15 },
  {
    id: "scalp-analysis",
    label: "Scalp analysis",
    price: 0,
    comingSoon: true,
  },
  { id: "beads", label: "Beads", price: 0 },
  { id: "burnt-ends", label: "Burnt ends", price: 10 },
  {
    id: "other",
    label: "Other",
    price: 0,
    note: "(specify in appointment notes)",
  },
];

export const SIZE_OPTIONS = ["Small", "Medium", "Large"] as const;
