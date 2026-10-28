import type { TwoFactorDevice } from "../../../lib/two-factor";
import type { StylistStudio } from "../../../lib/studio-api";
import type { StudioBookings } from "../../../lib/studio-api/bookings";
import { toStudioBookings } from "../bookings/records";
import { readSession } from "../../../utils/page-flags";
import { CATEGORY_COLOURS } from "./constants";
import { getSteps } from "./model";
import { toStudioPatch } from "./records";
import type { StudioState } from "./types";

/** The signed-in stylist and their business, loaded before Studio opens. */
export interface StudioSeed {
  owner: StudioState["owner"];
  studio: StylistStudio;
  bookings: StudioBookings;
  devices: TwoFactorDevice[];
}

export const SETUP_MINIMISED_KEY = "tw_setup_minimised";

const getCategoryColour = (sort: number) =>
  CATEGORY_COLOURS[sort % CATEGORY_COLOURS.length]?.value ?? "";

/** A real account: everything from the database. */
export const seedFromAccount = (
  state: StudioState,
  { owner, studio, bookings, devices }: StudioSeed,
): StudioState => {
  const patch = toStudioPatch(studio, state);

  const seeded: StudioState = {
    ...state,
    ...patch,
    ...toStudioBookings(bookings),
    owner,
    account: {
      stylistId: studio.id,
      slug: studio.slug,
      slugChangedAt: studio.slug_changed_at,
      isSuspended: studio.status === "suspended",
      suspendReason: studio.suspend_reason,
    },
    twoFactorSettings: { devices },
    categories: (patch.categories ?? []).map((category) => ({
      ...category,
      colour: category.colour || getCategoryColour(category.sort),
    })),
  };

  return {
    ...seeded,
    celebrated: Object.values(getSteps(seeded)).every(Boolean),
    setupMinimised: readSession(SETUP_MINIMISED_KEY) === "1",
  };
};
