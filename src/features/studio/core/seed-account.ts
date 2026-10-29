import type { TwoFactorDevice } from "../../../lib/two-factor";
import type { StylistStudio } from "../../../lib/studio-api";
import type { StudioBookings } from "../../../lib/studio-api/bookings";
import { toStudioBookings } from "../bookings/records";
import { readSession } from "../../../utils/page-flags";
import type { Catalogue } from "../../../types/catalogue";
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
  catalogue: Catalogue;
}

export const SETUP_MINIMISED_KEY = "tw_setup_minimised";

const REMINDER_AFTER_MS = 2 * 24 * 60 * 60 * 1000; // remind again after 2 days

const isPolicyReminderDue = (
  { went_live_at: wentLiveAt, stylist_private: details }: StylistStudio,
  { policy }: StudioState,
) => {
  if (policy.mode !== "none" || !wentLiveAt || details?.policy_reminded_at)
    return false;

  const since = Math.max(
    Date.parse(wentLiveAt),
    Date.parse(details?.policy_nudged_at ?? wentLiveAt),
  );

  return Date.now() - since >= REMINDER_AFTER_MS;
};

const getCategoryColour = (sort: number) =>
  CATEGORY_COLOURS[sort % CATEGORY_COLOURS.length]?.value ?? "";

/** A real account: everything from the database. */
export const seedFromAccount = (
  state: StudioState,
  { owner, studio, bookings, devices, catalogue }: StudioSeed,
): StudioState => {
  const patch = toStudioPatch(studio, state);

  const seeded: StudioState = {
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

  const isComplete = Object.values(getSteps(seeded)).every(Boolean);

  const isReminder =
    isComplete &&
    studio.status !== "suspended" &&
    isPolicyReminderDue(studio, seeded);

  return {
    ...seeded,
    celebrated: isComplete,
    setupMinimised: readSession(SETUP_MINIMISED_KEY) === "1",
    nudge: isReminder,
    policyReminder: isReminder,
  };
};
