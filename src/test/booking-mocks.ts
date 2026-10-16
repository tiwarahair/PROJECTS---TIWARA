import { vi } from "vitest";

/** vi.mock factories for the profile and booking calls (vi.mock can't take imported values, so they import these). */
export const mockPublicProfiles = async (
  original: () => Promise<typeof import("../lib/public-profiles")>,
) => {
  const { getDemoProfile } = await import("./demo-profile");

  return {
    ...(await original()),
    fetchPublicProfile: vi.fn((slug: string) =>
      Promise.resolve(getDemoProfile(slug)),
    ),
  };
};

export const mockBookingApi = async (
  original: () => Promise<typeof import("../lib/booking-api")>,
) => {
  const { getDemoSlots } = await import("./demo-profile");

  return {
    ...(await original()),
    getAvailableSlots: vi.fn((request: { from: string; to: string }) =>
      Promise.resolve(getDemoSlots(request)),
    ),
    holdBooking: vi.fn((request: { startsAt: string }) =>
      Promise.resolve({
        id: "hold-1",
        ref: "TH-TEST01",
        secret: "secret",
        starts_at: request.startsAt,
        hold_expires_at: new Date(Date.now() + 600_000).toISOString(),
      }),
    ),
  };
};
