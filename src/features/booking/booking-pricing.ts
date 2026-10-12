// Price, duration and policy amounts for the chosen service (prototype Booking money() / delta / cust line).
import type { Stylist } from "../../types/stylist";
import { money, policyLines } from "../../utils/pricing";
import type { PolicySummary } from "../../utils/pricing";
import { formatDuration } from "../../utils/services";
import type { ServiceOptions } from "../../utils/services";
import type { Service } from "../../types/service";
import type { Selection } from "./booking-state";

export interface BookingMoney {
  servicePrice: number;
  minutes: number;
  policy: PolicySummary;
  service: string;
  fee: string;
  total: string;
  dueToday: string;
  balance: string;
  price: string;
  duration: string;
}

const EMPTY_POLICY: PolicySummary = {
  dueToday: 0,
  lines: [],
  fee: 0,
  deposit: 0,
  balance: 0,
  price: 0,
  mode: "none",
  cardSaved: false,
  notes: [],
};

/** Base price + chosen size / length / own options / add-ons, then the stylist's policy amounts. */
export const getBookingMoney = (
  stylist: Stylist,
  service: Service | null,
  options: ServiceOptions,
  selection: Selection,
): BookingMoney => {
  let servicePrice = service ? service.price : 0;
  let minutes = service ? service.minutes : 0;

  const add = (option?: { priceDelta?: number; minutesDelta?: number }) => {
    if (!option) return;

    servicePrice += option.priceDelta || 0;
    minutes += option.minutesDelta || 0;
  };

  add(options.size.find(({ label }) => label === selection.size));
  add(options.length.find(({ label }) => label === selection.length));

  for (const { name, options: ownOptions } of options.own)
    add(ownOptions.find(({ label }) => label === selection.own[name]));

  for (const { name, price, minutes: addonMinutes } of options.addons)
    if (selection.addons.includes(name)) {
      servicePrice += price;
      minutes += addonMinutes || 0;
    }

  const ready = !!stylist.policies?.mode;

  const policy = ready
    ? policyLines(stylist.policies, servicePrice, stylist.name)
    : EMPTY_POLICY;

  return {
    servicePrice,
    minutes,
    policy,
    service: money(servicePrice),
    fee: money(policy.fee),
    total: money(servicePrice + policy.fee),
    dueToday: money(policy.dueToday),
    balance: money(policy.balance),
    price: money(servicePrice),
    duration: formatDuration(minutes),
  };
};

interface DeltaOption {
  priceDelta?: number;
  minutesDelta?: number;
}

/** "+£10 +1 hr" on an option chip; minutes only where showMins (own customisations). */
export const getDeltaLabel = (
  { priceDelta, minutesDelta }: DeltaOption,
  showMinutes = false,
): string => {
  const price = priceDelta || 0;
  const minutes = minutesDelta || 0;
  const parts: string[] = [];

  if (price) parts.push((price > 0 ? "+£" : "−£") + Math.abs(price));

  if (minutes && showMinutes)
    parts.push((minutes > 0 ? "+" : "−") + formatDuration(Math.abs(minutes)));

  return parts.join(" ");
};

/** "Medium · Shoulder · 30 Auburn · Beads" — the picks in order, add-ons last. */
export const getCustomisationLine = (
  options: ServiceOptions,
  selection: Selection,
): string => {
  const ownChosen = options.own
    .map(({ name }) => selection.own[name])
    .filter(Boolean);

  return [
    selection.size,
    selection.length,
    options.colour ? selection.colour : null,
    ...ownChosen,
  ]
    .filter(Boolean)
    .concat(selection.addons)
    .join(" · ");
};
