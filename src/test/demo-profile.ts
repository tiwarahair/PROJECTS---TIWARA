import { DEMO_STYLISTS } from "./fixtures/demo-stylists";
import type { PublicProfile, ServiceRow } from "../lib/public-profiles";
import type { Service } from "../types/service";

const pence = (pounds: number) => Math.round(pounds * 100);

const WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

const BUSINESS_TYPES = {
  shop: "shop",
  chairRental: "chair_rental",
  homeBased: "home_based",
  mobile: "mobile",
};

const LONDON_HOUR = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/London",
  hour: "2-digit",
  hourCycle: "h23",
});

export const getDemoProfile = (slug: string): PublicProfile => {
  const stylist = DEMO_STYLISTS.find(({ id }) => id === slug);

  if (!stylist) throw new Error(`No demo stylist ${slug}`);

  const getAddonId = (name: string) => `${slug}-addon-${name}`;

  const addonNames = [
    ...new Set(
      stylist.services.flatMap(({ addons }) => addons.map(({ name }) => name)),
    ),
  ];

  const toVariations = (service: Service) => [
    ...(["size", "length"] as const).flatMap((kind) =>
      (service.customisations?.[kind].options ?? []).map((option, sort) => ({
        id: `${service.id}-${kind}-${option.label}`,
        service_id: service.id,
        kind,
        group_name: null,
        label: option.label,
        offered: option.on,
        price_delta_pence: pence(option.priceDelta),
        minutes_delta: option.minutesDelta,
        sort,
      })),
    ),
    ...service.ownCustomisations.flatMap(({ name, options }) =>
      options.map((option, sort) => ({
        id: `${service.id}-own-${name}-${option.label}`,
        service_id: service.id,
        kind: "own",
        group_name: name,
        label: option.label,
        offered: true,
        price_delta_pence: pence(option.priceDelta),
        minutes_delta: option.minutesDelta,
        sort,
      })),
    ),
  ];

  const toServiceRow = (service: Service, sort: number): ServiceRow => ({
    id: service.id,
    stylist_id: slug,
    service_type_id: service.serviceTypeId,
    service_group_id: "braids",
    category_id: service.categoryId,
    name: service.name,
    description: service.description,
    price_pence: pence(service.price),
    duration_min: service.minutes,
    extra_time_min: null,
    status: "active",
    sort,
    sizes_on: !!service.customisations?.size.on,
    lengths_on: !!service.customisations?.length.on,
    service_variations: toVariations(service),
    service_addons: service.addons.map(({ name, price, minutes }) => ({
      service_id: service.id,
      addon_id: getAddonId(name),
      price_override_pence: pence(price),
      minutes_override: minutes,
    })),
  });

  const { policies } = stylist;

  return {
    slug,
    business_name: stylist.name,
    business_type: BUSINESS_TYPES[stylist.businessType],
    rating: stylist.reviews >= 3 ? stylist.rating : null,
    review_count: stylist.reviews,
    bio: stylist.bio,
    area_label: stylist.area,
    travel_radius_miles: stylist.travelMiles ?? null,
    contact_email: null,
    instagram: null,
    tiktok: null,
    youtube: null,
    website: null,
    cover_path: stylist.cover,
    status: "live",
    pause_on: false,
    pause_until: null,
    next_start: null,
    stylist_categories: stylist.categories.map(({ id, name, sort }) => ({
      id,
      stylist_id: slug,
      service_group_id: null,
      name,
      sort,
      colour: null,
    })),
    services: stylist.services
      .filter(({ status }) => status === "active")
      .map(toServiceRow),
    addons: addonNames.map((name) => ({
      id: getAddonId(name),
      stylist_id: slug,
      service_group_id: null,
      category_id: null,
      name,
      price_pence: 0,
      minutes: 0,
      status: "active",
      created_at: "",
    })),
    working_hours: WEEKDAYS.map((key, weekday) => {
      const [start, end] = stylist.availability[key]?.[0] ?? ["09:00", "18:00"];

      return {
        stylist_id: slug,
        weekday,
        is_open: !!stylist.availability[key]?.length,
        start_time: `${start}:00`,
        end_time: `${end}:00`,
      };
    }),
    payment_policy: {
      id: `${slug}-policy`,
      stylist_id: slug,
      mode: policies.mode,
      deposit_percent: policies.depositPercent,
      refundable: policies.refundable,
      free_window_hours: policies.freeWindowHours,
      grace_minutes: policies.graceMinutes,
      late_on: policies.late.on,
      late_kind: policies.late.kind,
      late_percent: policies.late.percent,
      no_show_on: policies.noShow.on,
      no_show_kind: policies.noShow.kind,
      no_show_percent: policies.noShow.percent,
      extras: [],
      created_at: "",
    },
    portfolio_photos: stylist.portfolio.map((path, sort) => ({
      id: `${slug}-photo-${sort}`,
      stylist_id: slug,
      path,
      sort,
      created_at: "",
    })),
  };
};

export const getDemoSlots = ({ from, to }: { from: string; to: string }) => {
  const slots: string[] = [];
  const last = new Date(`${to}T12:00:00Z`);

  for (
    const day = new Date(`${from}T12:00:00Z`);
    day <= last;
    day.setUTCDate(day.getUTCDate() + 1)
  ) {
    const offset = Number(LONDON_HOUR.format(day)) - 12;

    for (let minutes = 9 * 60; minutes <= 17 * 60; minutes += 30) {
      const slot = new Date(day);

      slot.setUTCHours(0, minutes - offset * 60);

      if (slot.getTime() > Date.now()) slots.push(slot.toISOString());
    }
  }

  return slots;
};
