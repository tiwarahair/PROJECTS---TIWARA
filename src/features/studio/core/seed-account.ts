import type { TwoFactorDevice } from "../../../lib/two-factor";
import type { StylistStudio } from "../../../lib/studio-api";
import type { StudioBookings } from "../../../lib/studio-api/bookings";
import { toStudioBookings } from "../bookings/records";
import type { Catalogue } from "../../../types/catalogue";
import { CATEGORY_COLOURS } from "./constants";
import { toStudioPatch } from "./records";
import type { StudioState } from "./types";

/** The signed-in stylist and their business, loaded before Studio opens. */
export interface StudioSeed {
  owner: StudioState["owner"];
  studio: StylistStudio;
  bookings: StudioBookings;
  devices: TwoFactorDevice[];
  catalogue: Catalogue;
}

const getCategoryColour = (sort: number) =>
  CATEGORY_COLOURS[sort % CATEGORY_COLOURS.length]?.value ?? "";

/** A real account: everything from the database. */
export const seedFromAccount = (
  state: StudioState,
  { owner, studio, bookings, devices, catalogue }: StudioSeed,
): StudioState => {
  const patch = toStudioPatch(studio, state);

  return {
    ...state,
    ...patch,
    ...toStudioBookings(bookings),
    catalogue,
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
};
