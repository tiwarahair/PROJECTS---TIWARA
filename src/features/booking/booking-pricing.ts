// Price, duration and policy amounts for the chosen service (prototype Booking money() / delta / cust line).
import type { Stylist } from "../../types/stylist";
import { money, policyLines } from "../../utils/pricing";
import type { PolicySummary } from "../../utils/pricing";
import { formatDuration } from "../../utils/services";
import type { ServiceOptions } from "../../utils/services";
import type { Service } from "../../types/service";
import type { Selection } from "./booking-state";

export interface BookingMoney {
  svcP: number;
  mins: number;
  PL: PolicySummary;
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
  let svcP = service ? service.price : 0;
  let mins = service ? service.mins : 0;
  const add = (option?: { priceDelta?: number; minsDelta?: number }) => {
    if (!option) return;
    svcP += option.priceDelta || 0;
    mins += option.minsDelta || 0;
  };
  add(options.size.find(({ label }) => label === selection.size));
  add(options.length.find(({ label }) => label === selection.length));
  for (const { name, options: ownOptions } of options.own)
    add(ownOptions.find(({ label }) => label === selection.own[name]));
  for (const { name, price, mins: addonMins } of options.addons)
    if (selection.addons.includes(name)) {
      svcP += price;
      mins += addonMins || 0;
    }
  const ready = !!stylist.policies?.mode;
  const PL = ready
    ? policyLines(stylist.policies, svcP, stylist.name)
    : EMPTY_POLICY;
  return {
    svcP,
    mins,
    PL,
    service: money(svcP),
    fee: money(PL.fee),
    total: money(svcP + PL.fee),
    dueToday: money(PL.dueToday),
    balance: money(PL.balance),
    price: money(svcP),
    duration: formatDuration(mins),
  };
};

interface DeltaOption {
  priceDelta?: number;
  minsDelta?: number;
}

/** "+£10 +1 hr" on an option chip; minutes only where showMins (own customisations). */
export const getDeltaLabel = (
  { priceDelta, minsDelta }: DeltaOption,
  showMins = false,
): string => {
  const price = priceDelta || 0;
  const minutes = minsDelta || 0;
  const parts: string[] = [];
  if (price) parts.push((price > 0 ? "+£" : "−£") + Math.abs(price));
  if (minutes && showMins)
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
