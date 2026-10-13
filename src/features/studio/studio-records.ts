// The stylist's business from the database → the parts of Studio's state it fills.
import type { StylistStudio } from "../../lib/studio-api";
import { getPhotoUrl } from "../../lib/studio-api";
import { toShownBusinessType } from "../../utils/business-type";
import { MONDAY_FIRST_WEEKDAYS } from "../../utils/dates";
import { bySort } from "../../utils/sort";
import {
  buildBlockedTime,
  formatClosedSpan,
  toOffset,
} from "./studio-blocked-time";
import { toStudioAddon, toStudioService } from "./studio-service-records";
import {
  toExtras,
  toFeeKind,
  toPolicyMode,
  toTaxDetails,
} from "./studio-settings-records";
import type { StudioState } from "./studio-types";

const getClockTime = (time: string | null) => (time ?? "").slice(0, 5);

/** The parts of Studio's state that come from the stylist's own data. */
export const toStudioPatch = (
  studio: StylistStudio,
  state: StudioState,
): Partial<StudioState> => {
  const policy = studio.payment_policies[0];
  const rules = studio.booking_rules;
  const address = studio.stylist_private;
  const isMobile = studio.business_type === "mobile";

  return {
    profile: {
      salon: studio.business_name,
      about: studio.bio ?? "",
      address: studio.area_label ?? "",
      mobile: isMobile,
      site: studio.website ?? "",
      instagram: studio.instagram ?? "",
      tiktok: studio.tiktok ?? "",
      youtube: studio.youtube ?? "",
      email: studio.contact_email ?? "",
    },
    business: {
      type: toShownBusinessType(studio.business_type),
      vatOn: studio.vat_registered,
      details: {
        line1: address?.line1 ?? "",
        line2: address?.line2 ?? "",
        city: address?.city ?? "",
        postcode: address?.postcode ?? "",
        basePostcode: address?.postcode ?? "",
        radius: String(studio.travel_radius_miles ?? ""),
        phone: studio.contact_phone ?? "",
        email: studio.contact_email ?? "",
        vat: studio.vat_number ?? "",
      },
    },
    coverUrl: studio.cover_path ? getPhotoUrl(studio.cover_path) : null,
    avatarUrl: studio.avatar_path ? getPhotoUrl(studio.avatar_path) : null,
    portfolio: [...studio.portfolio_photos]
      .sort(bySort)
      .map(({ id, path }) => ({ id, src: getPhotoUrl(path), path })),
    categories: [...studio.stylist_categories]
      .sort(bySort)
      .map(({ id, name, sort, colour }) => ({
        id,
        name,
        sort,
        colour: colour ?? "",
      })),
    services: [...studio.services].sort(bySort).map(toStudioService),
    addons: studio.addons.map(toStudioAddon),
    hours: [...studio.working_hours]
      .sort((left, right) => left.weekday - right.weekday)
      .map(({ weekday, is_open, start_time, end_time }) => ({
        day: MONDAY_FIRST_WEEKDAYS[weekday] ?? "",
        on: is_open,
        start: getClockTime(start_time),
        end: getClockTime(end_time),
      })),
    blocked: studio.time_blocks.map((row) =>
      buildBlockedTime({
        id: row.id,
        dayIndex: toOffset(row.starts_on),
        allDay: row.all_day,
        start: getClockTime(row.start_time),
        end: getClockTime(row.end_time),
        note: row.reason,
        frequency: row.repeat,
        ends: row.repeat_until ? "date" : "never",
        endDayOffset: row.repeat_until ? toOffset(row.repeat_until) : null,
        color: row.colour,
      }),
    ),
    closed: studio.closed_periods.map(({ id, starts_on, ends_on, reason }) => ({
      id,
      from: starts_on,
      to: ends_on,
      span: formatClosedSpan(starts_on, ends_on),
      reason,
    })),
    rules: rules
      ? {
          minNotice: rules.min_notice_hours,
          maxNotice: rules.max_notice_months,
          extra: rules.default_extra_minutes,
          travel: rules.travel_buffer_minutes,
        }
      : state.rules,
    policy: policy
      ? {
          mode: toPolicyMode(policy.mode),
          deposit: policy.deposit_percent || state.policy.deposit,
          refundable: policy.refundable,
          window: Number(policy.free_window_hours),
          grace: policy.grace_minutes,
          late: {
            on: policy.late_on,
            kind: toFeeKind(policy.late_kind),
            percent: policy.late_percent,
          },
          noShow: {
            on: policy.no_show_on,
            kind: toFeeKind(policy.no_show_kind),
            percent: policy.no_show_percent,
          },
          extras: toExtras(policy.extras),
        }
      : state.policy,
    pause: { on: studio.pause_on, until: studio.pause_until ?? "" },
    tax: studio.stylist_tax_details
      ? toTaxDetails(studio.stylist_tax_details)
      : null,
    check: {
      ...state.check,
      availability: !!studio.availability_confirmed_at,
      profile: !!studio.profile_confirmed_at,
    },
  };
};
