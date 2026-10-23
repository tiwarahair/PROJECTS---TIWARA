import { screen } from "@testing-library/react";
import { vi } from "vitest";
import { EMPTY_ADDRESS } from "../features/booking/logic/constants";
import type { BookingDraft } from "../features/booking/logic/types";
import { BookingPage } from "../features/booking/route";
import { renderWithStore } from "./render-with-store";

export const renderBooking = async (
  query: string,
  options?: Parameters<typeof renderWithStore>[2],
) => {
  const search = query.includes("stylist=")
    ? query
    : `stylist=tiwaras-house&${query}`;

  const result = renderWithStore(<BookingPage />, `/book?${search}`, options);

  await vi.waitFor(() => {
    if (!document.querySelector('[data-screen-label="Booking"]'))
      throw new Error("still loading");
  });

  return result;
};

export const GUEST_DETAILS = {
  first: "Nia",
  last: "Okafor",
  email: "nia.okafor@gmail.com",
  phone: "07700 900123",
  notes: "",
};

/** Resumes a saved silk press booking: 10:30 a week from now, held for ten minutes, on Time unless the patch moves it on. */
export const renderSavedBooking = async (
  patch: Partial<BookingDraft> = {},
  options?: Parameters<typeof renderWithStore>[2],
) => {
  const day = new Date();

  day.setDate(day.getDate() + 7);

  const draft: BookingDraft = {
    at: Date.now(),
    step: 3,
    serviceId: "tiwaras-house--silk-press",
    selection: { size: null, length: null, colour: "", own: {}, addons: [] },
    calendarMonth: day.getMonth(),
    calendarYear: day.getFullYear(),
    date: day.getDate(),
    time: "10:30",
    details: { first: "", last: "", email: "", phone: "", notes: "" },
    appointmentAddress: { ...EMPTY_ADDRESS },
    holdUntil: Date.now() + 600_000,
    holdId: "hold-1",
    holdSecret: "secret",
    guest: false,
    ...patch,
  };

  localStorage.setItem("tw_bk_draft_tiwaras-house", JSON.stringify(draft));

  const result = await renderBooking("resume=1", options);

  // the held time is checked against the day's open times before Continue is enabled
  await vi.waitFor(() => {
    const [next] = screen.queryAllByRole("button", { name: /^Continue/ });

    if (next?.hasAttribute("disabled"))
      throw new Error("still checking the time");
  });

  return result;
};
