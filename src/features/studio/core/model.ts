// Studio's state-reading helpers (they read state but don't set it).
import { serviceTypes } from "../../../data";
import {
  BLOCK_COLORS,
  BOOKING_LINK,
  CATEGORY_COLOURS,
  CLIENTS,
  NO_CATEGORY_TONE,
  STUDIO_STYLIST_ID,
} from "./data";
import {
  dateAt,
  durationToMinutes,
  hhmm,
  parseAmountLabel,
  parseNumber,
  parseWholeNumber,
  timeRange,
  timeToMinutes,
} from "./format";
import type {
  BlockedTime,
  ConfirmDialog,
  PastRecord,
  StudioAddon,
  StudioBooking,
  StudioCategory,
  StudioClient,
  StudioService,
  StudioState,
} from "./types";
import { formatDuration } from "../../../utils/dates";
import { formatMoney, roundToPence } from "../../../utils/money";

const WALK_IN: StudioClient = {
  id: null,
  walkIn: true,
  name: "Walk-in",
  first: "this client",
  img: "",
  area: "",
  visits: 0,
  since: "",
  spent: 0,
  phone: "",
  email: "",
};

/** A client with any Studio edits applied; null is a walk-in. */
export const getClient = (
  state: StudioState,
  id: string | null | undefined,
): StudioClient => {
  if (id === null) return WALK_IN;

  const base =
    CLIENTS.find((client) => client.id === id) ??
    state.extraClients.find((client) => client.id === id) ??
    (CLIENTS[0] as StudioClient);

  const override = state.clientOverrides[base.id ?? ""];
  const client = override ? { ...base, ...override } : base;

  if (client.deleted)
    return {
      ...client,
      name: "Deleted client",
      first: "Deleted client",
      img: "",
      phone: "",
      email: "",
      address: "",
      area: "",
      notes: null,
      sensitivities: "",
      fav: "",
    };

  const address = state.clientAddresses[client.id ?? ""];

  return address ? { ...client, address } : client;
};

export const getAllClients = (state: StudioState): StudioClient[] =>
  CLIENTS.concat(state.extraClients)
    .map(({ id }) => getClient(state, id))
    .filter(({ deleted }) => !deleted);

export const getSortedCategories = (state: StudioState): StudioCategory[] =>
  state.categories.slice().sort((first, second) => first.sort - second.sort);

export const getCategoryById = (
  state: StudioState,
  id: string | null | undefined,
): StudioCategory | null =>
  state.categories.find((category) => category.id === id) ?? null;

export const getCategoryTone = (
  state: StudioState,
  id: string | null | undefined,
): string => getCategoryById(state, id)?.colour ?? NO_CATEGORY_TONE;

export const getAddonCategory = (
  state: StudioState,
  addon: StudioAddon | null | undefined,
): string =>
  addon && getCategoryById(state, addon.categoryId)
    ? (addon.categoryId as string)
    : "none";

export const getNextCategoryColour = (categories: StudioCategory[]): string => {
  const used = categories.map(({ colour }) => colour);
  const free = CATEGORY_COLOURS.find(({ value }) => !used.includes(value));

  return (
    (free ?? CATEGORY_COLOURS[categories.length % CATEGORY_COLOURS.length])
      ?.value ?? ""
  );
};

export const getCategoryNameError = (
  state: StudioState,
  name: string,
  exceptId?: string,
): string => {
  const trimmed = String(name || "").trim();

  if (!trimmed) return "Add a name";

  const duplicate = state.categories.find(
    ({ id, name: other }) =>
      id !== exceptId && other.trim().toLowerCase() === trimmed.toLowerCase(),
  );

  return duplicate
    ? `You already have a category called ‘${duplicate.name}’`
    : "";
};

export const getTypeOf = (service: StudioService | null | undefined) => {
  if (!service) return null;

  return (
    serviceTypes.find(({ id }) => id === service.typeId) ??
    serviceTypes.find(
      ({ groupId, name }) =>
        groupId === service.taxonomyId && name === service.subcategory,
    ) ??
    null
  );
};

export const getTileTone = (state: StudioState, name: string) => {
  const service = state.services.find((item) => item.name === name);

  const colour = service
    ? getCategoryTone(state, service.categoryId)
    : NO_CATEGORY_TONE;

  return {
    bar: colour,
    background: `color-mix(in srgb, ${colour} 11%, #fff)`,
    text: "#1a1714",
    meta: "#3d372f",
    hatch: `color-mix(in srgb, ${colour} 18%, transparent)`,
  };
};

export const getBlockColour = () =>
  BLOCK_COLORS[0] ?? { id: "ink", label: "Blocked", hex: "#1a1714" };

export const getServiceExtra = (
  state: StudioState,
  service: StudioService,
): number =>
  service.extraCustom ? service.extra || 0 : state.rules.extra || 0;

export const getExtraByName = (state: StudioState, name: string): number => {
  const service = state.services.find((item) => item.name === name);

  return service ? getServiceExtra(state, service) : 0;
};

export const getBookingBuffer = (state: StudioState, name: string): number =>
  getExtraByName(state, name) +
  (state.profile.mobile ? state.rules.travel || 0 : 0);

export const getServiceDuration = (state: StudioState, name: string): string =>
  state.services.find((item) => item.name === name)?.duration || "";

interface AddonAmounts {
  price: string | number;
  hours: string | number;
  min: string | number;
}

export const formatAddon = (addon: AddonAmounts): string => {
  const minutes =
    parseWholeNumber(addon.hours) * 60 + parseWholeNumber(addon.min);

  const price = parseNumber(addon.price);
  const timeLabel = minutes ? formatDuration(minutes) : "no extra time";

  return `+£${price}, ${timeLabel}`;
};

export const getWorkingHours = (state: StudioState, offset: number) => {
  const date = new Date();

  date.setDate(date.getDate() + (offset || 0));

  return (
    state.hours[(date.getDay() + 6) % 7] ?? {
      day: "",
      on: true,
      start: "09:00",
      end: "18:00",
    }
  );
};

export const isBlockOn = (block: BlockedTime, offset: number): boolean => {
  const start = block.dayIndex == null ? 0 : block.dayIndex;

  if (offset === start) return true;

  const frequency = block.frequency || "none";

  if (frequency === "none" || offset < start) return false;

  if (
    (block.ends || "never") === "date" &&
    block.endDayOffset != null &&
    offset > block.endDayOffset
  )
    return false;

  if (frequency === "daily") return true;

  if (frequency === "weekly") return (offset - start) % 7 === 0;

  if (frequency === "monthly") {
    const first = dateAt(start);
    const current = dateAt(offset);

    if (current.getDate() === first.getDate()) return true;

    const last = new Date(
      current.getFullYear(),
      current.getMonth() + 1,
      0,
    ).getDate();

    return first.getDate() > last && current.getDate() === last;
  }

  return false;
};

export const getBlockRange = (
  state: StudioState,
  block: BlockedTime,
  offset: number,
): [number, number] => {
  if (block.span === "All day") {
    const hours = getWorkingHours(state, offset);

    return hours.on
      ? [timeToMinutes(hours.start), timeToMinutes(hours.end)]
      : [0, 1440];
  }

  const parts = block.span.split(" to ");

  return [timeToMinutes(parts[0]), timeToMinutes(parts[1] || parts[0])];
};

interface BusyRange {
  startMinutes: number;
  endMinutes: number;
  kind: "booking" | "block";
  booking?: StudioBooking;
  block?: BlockedTime;
}

export const getBusy = (
  state: StudioState,
  offset: number,
  excludeId?: number | null,
): BusyRange[] => {
  const ranges: BusyRange[] = [];

  state.bookings
    .filter(
      (booking) => booking.dayOffset === offset && booking.id !== excludeId,
    )
    .forEach((booking) => {
      const start = timeToMinutes(booking.time);

      ranges.push({
        startMinutes: start,
        endMinutes:
          start +
          durationToMinutes(
            booking.duration || getServiceDuration(state, booking.service),
          ) +
          getBookingBuffer(state, booking.service),
        kind: "booking",
        booking,
      });
    });

  state.blocked
    .filter((block) => isBlockOn(block, offset))
    .forEach((block) => {
      const [start, end] = getBlockRange(state, block, offset);

      ranges.push({
        startMinutes: start,
        endMinutes: end,
        kind: "block",
        block,
      });
    });

  return ranges;
};

export const getSlots = (
  state: StudioState,
  offset: number | null,
  duration: number,
  buffer: number,
  excludeId: number | null,
): string[] => {
  if (offset == null) return [];

  const hours = getWorkingHours(state, offset);

  if (!hours.on) return [];

  const open = timeToMinutes(hours.start);
  const close = timeToMinutes(hours.end);
  const busy = getBusy(state, offset, excludeId);
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const slots: string[] = [];

  for (
    let start = open;
    start + duration + (buffer || 0) <= close;
    start += 30
  ) {
    if (offset === 0 && start < nowMinutes) continue;

    const end = start + duration + (buffer || 0);

    if (
      busy.some(
        ({ startMinutes, endMinutes }) =>
          startMinutes < end && endMinutes > start,
      )
    )
      continue;

    slots.push(hhmm(start));
  }

  return slots;
};

export const getConflicts = (
  state: StudioState,
  offset: number | null,
  time: string | null,
  duration: number,
  excludeId: number | null,
) => {
  if (offset == null || !time) return [];

  const start = timeToMinutes(time);
  const end = start + (duration || 0);

  return getBusy(state, offset, excludeId)
    .filter(
      ({ startMinutes, endMinutes }) =>
        startMinutes < end && endMinutes > start,
    )
    .map(({ kind, booking, block }) =>
      kind === "booking" && booking
        ? {
            name: getClient(state, booking.client).name,
            range: timeRange(
              booking.time,
              booking.duration || getServiceDuration(state, booking.service),
            ),
          }
        : {
            name: (block?.reason || "Blocked time").replace(
              /( · )?Repeats.*$/,
              "",
            ),
            range:
              block?.span === "All day"
                ? "all day"
                : (block?.span ?? "").replace(" to ", "–"),
          },
    );
};

export const isOngoing = (
  booking: StudioBooking | null | undefined,
): boolean => {
  if (
    !booking ||
    booking.dayOffset !== 0 ||
    (booking.status || "confirmed") !== "arrived"
  )
    return false;

  const now = new Date();

  return now.getHours() * 60 + now.getMinutes() >= timeToMinutes(booking.time);
};

export const getPastRows = (
  state: StudioState,
  isNew: boolean,
  seed: PastRecord[],
): PastRecord[] => {
  const overrides = state.pastOverrides ?? {};

  if (isNew) return [];

  return state.pastNew.concat(
    seed.map((original, index) => {
      const row = original.pastId
        ? original
        : { pastId: `seed-${index}`, ...original };

      const override = overrides[String(row.pastId)];

      return override ? { ...row, ...override } : row;
    }),
  );
};

export const isPastIn = (row: PastRecord, filter: string): boolean => {
  if (filter === "completed") return row.status === "Completed";

  if (filter === "off") return row.status !== "Completed";

  if (filter === "cancelled") return row.status === "Cancelled";

  if (filter === "noshow") return row.status === "No show";

  if (filter === "failed") return row.status === "Payment failed";

  return true;
};

export const getPastKey = (row: PastRecord): string | number =>
  row.pastId || `${row.client}|${row.when}|${row.time}`;

export const hasTwoFactor = (state: StudioState): boolean =>
  state.twoFactorSettings.devices.length > 0;

export const isLive = (state: StudioState): boolean =>
  hasTwoFactor(state) && !!state.tax && !!state.check.stripe;

export const getBookingLink = ({ account }: StudioState) =>
  account ? `tiwarashouse.com/${account.slug}` : BOOKING_LINK;

export const getProfilePath = ({ account }: StudioState) =>
  `/${account?.slug ?? STUDIO_STYLIST_ID}`;

export const getSteps = (state: StudioState) => ({
  availability: !!state.check.availability,
  profile: !!state.check.profile,
  secure: hasTwoFactor(state) && !!state.tax && !!state.check.stripe,
  services: state.services.some(({ status }) => status === "active"),
});

export const getProtectionNoun = ({ policy }: StudioState): string => {
  if (policy.mode === "deposit") return `${policy.deposit}% deposit`;

  if (policy.mode === "card") return "card on file";

  return policy.mode === "full" ? "full payment" : "";
};

const getProtectionAmount = (
  { policy }: StudioState,
  price: number,
): number => {
  if (policy.mode === "deposit")
    return Math.round(price * policy.deposit) / 100;

  return policy.mode === "full" ? price : 0;
};

const getBookingFee = (amount: number): number =>
  amount > 0 ? Math.round((amount * 0.015 + 0.5) * 100) / 100 : 0;

export const getProtectionTotal = (
  state: StudioState,
  price: number,
): number => {
  const amount = getProtectionAmount(state, price);

  return Math.round((amount + getBookingFee(amount)) * 100) / 100;
};

/** Link expiry: 48 hours from sending, or 2 hours before the start, whichever is first. */
export const getProtectionExpiry = (
  from: number,
  offset: number | null,
  time: string | null,
): number => {
  const base = (from || Date.now()) + 48 * 3600 * 1000;

  if (offset == null || !time) return base;

  const date = new Date();

  date.setDate(date.getDate() + offset);
  const parts = String(time).split(":");

  date.setHours(
    parseInt(parts[0] ?? "", 10) || 0,
    parseInt(parts[1] ?? "", 10) || 0,
    0,
    0,
  );

  return Math.min(base, date.getTime() - 2 * 3600 * 1000);
};

interface PolicyFee {
  amount: number;
  label?: string;
  subtitle?: string;
  refund: string;
}

/** Late-cancellation ("late") or no-show ("noShow") charge from the saved payment policy. */
export const getPolicyFee = (
  state: StudioState,
  kind: "late" | "noShow",
  booking: { price: number },
): PolicyFee => {
  const policy = state.policy;
  const mode = policy.mode || "none";
  const price = +booking.price || 0;
  const fee = policy[kind];

  const deposit = roundToPence((price * (policy.deposit || 0)) / 100);

  const getRefund = () => {
    if (mode === "deposit") return "Deposit refunded";

    return mode === "full" ? "Refunded in full" : "Nothing charged";
  };

  const refund = getRefund();

  if (mode === "none") return { amount: 0, refund };

  const getBaseAmount = () => {
    if (!fee.on) return 0;

    if (mode === "deposit" && fee.kind === "keep") return deposit;

    return roundToPence((price * (fee.percent || 0)) / 100);
  };

  let amount = getBaseAmount();

  if (mode === "deposit" && !policy.refundable)
    amount = Math.max(amount, deposit);

  if (mode === "full") amount = Math.min(amount, price);

  if (amount <= 0) return { amount: 0, refund };

  const getSubtitle = () => {
    if (mode === "deposit") {
      if (Math.abs(amount - deposit) < 0.005)
        return `${formatMoney(deposit)} deposit kept`;

      if (amount < deposit) {
        const refunded = formatMoney(deposit - amount);

        return `${formatMoney(amount)} kept from the deposit, ${refunded} refunded`;
      }

      const charged = formatMoney(amount - deposit);

      return `${formatMoney(deposit)} deposit kept and ${charged} charged to the card on file`;
    }

    if (mode === "full")
      return amount >= price
        ? `${formatMoney(price)} kept, no refund`
        : `${formatMoney(amount)} kept, ${formatMoney(price - amount)} refunded`;

    return `${formatMoney(amount)} charged to the card on file`;
  };

  const subtitle = getSubtitle();

  return { amount, label: formatMoney(amount), subtitle, refund };
};

export const getWaiveConfirm = (
  state: StudioState,
  row: PastRecord,
  client: StudioClient | null,
  isFresh: boolean,
  run: () => void,
): ConfirmDialog => {
  const policy = state.policy;
  const first = (client?.name || "the client").split(" ")[0];

  const fee = parseAmountLabel(row.feeLabel);

  const deposit = Math.round(row.price * (policy.deposit || 0)) / 100;

  if (!isFresh)
    return {
      title: `Refund ${formatMoney(fee)} to ${first}’s card ending 4242?`,
      body: "It usually takes 5–10 business days to arrive. The card fee isn’t returned.",
      yesLabel: `Refund ${formatMoney(fee)}`,
      yes: run,
    };

  const mode = policy.mode;

  const getBody = () => {
    if (mode === "deposit")
      return policy.refundable
        ? `Her ${formatMoney(deposit)} deposit will be refunded and she won’t be charged anything else.`
        : `She won’t be charged the extra ${formatMoney(Math.max(0, fee - deposit))}. Her ${formatMoney(deposit)} deposit is non-refundable and will be kept.`;

    if (mode === "full")
      return `The ${formatMoney(fee)} will be refunded to her card.`;

    return "She won’t be charged.";
  };

  const body = getBody();

  return {
    title: `Waive ${first}’s ${formatMoney(fee)} fee?`,
    body: `${body} The booking fee isn’t refunded.`,
    yesLabel: "Waive fee",
    yes: run,
  };
};

const normalisePhone = (phone: string | null | undefined): string => {
  let digits = String(phone || "").replace(/\D/g, "");

  if (digits.startsWith("44")) digits = `0${digits.slice(2)}`;

  return digits;
};

export interface DuplicateHit {
  client: StudioClient;
  field: "phone" | "email";
}

/** Another client already using this phone or email. */
export const findDuplicate = (
  state: StudioState,
  phone: string | null | undefined,
  email: string | null | undefined,
  exceptId: string | null,
): DuplicateHit | null => {
  const normalised = normalisePhone(phone);

  const address = String(email || "")
    .trim()
    .toLowerCase();

  if (normalised.length < 10 && !address.includes("@")) return null;

  for (const client of getAllClients(state)) {
    if (client.id === exceptId) continue;

    if (normalised.length >= 10 && normalisePhone(client.phone) === normalised)
      return { client, field: "phone" };

    if (
      address.includes("@") &&
      String(client.email || "")
        .trim()
        .toLowerCase() === address
    )
      return { client, field: "email" };
  }

  return null;
};

export const getQueryParam = (key: string) => {
  try {
    return new URLSearchParams(location.search).get(key);
  } catch {
    return null;
  }
};
