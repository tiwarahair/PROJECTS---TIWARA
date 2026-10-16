import { vi } from "vitest";
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
