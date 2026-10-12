// Earnings demo ledger and its date helpers. The ledger is generated from a seeded random sequence, so it is the same on every
// load of the same day.
import { roundToPence } from "../../utils/money";
import { formatWeekdayDate } from "../../utils/dates";

export type EarningsScenario =
  "default" | "onhold" | "paused" | "setup" | "empty";
export type TransactionStatus =
  "Pending" | "Available" | "On hold" | "Paid out" | "Refunded" | "Recorded";
export type PeriodId = "week" | "month" | "lastmonth" | "custom";

type PayoutState = "Paid" | "In transit" | "Failed";

export interface EarningsClient {
  id: string;
  name: string;
  email?: string;
}

/** A Studio service (only the fields the ledger reads). */
export interface EarningsService {
  name: string;
  price: number | string;
  status?: string;
  durationHours?: number | string;
  durationMinutes?: number | string;
}

export interface Transaction {
  id: string;
  client: string;
  service: string;
  bookingRef: string;
  appointment: Date;
  description: string;
  method: string;
  at: Date;
  amount: number;
  fee: number | null;
  net: number;
  status: TransactionStatus;
  isRecorded?: boolean;
  hold?: boolean;
  holdUntil?: Date;
  refunded?: boolean;
  note?: string;
  payoutId?: string;
}

export interface Payout {
  id: string;
  amount: number;
  gross: number;
  fees: number;
  refunds: number;
  sent: Date;
  arrive: Date;
  status: PayoutState;
  items: Transaction[];
  from: Date;
}

export interface Ledger {
  transactions: Transaction[];
  payouts: Payout[];
  available: number;
  pending: number;
  onHold: number;
  pausedAmount: number;
  nextDate: Date | null;
  today: Date;
  scenario: EarningsScenario;
}

export interface DateRange {
  start: Date;
  end: Date;
}

const DAY_MS = 86400000;

export const PERIODS: [PeriodId, string][] = [
  ["week", "This week"],
  ["month", "This month"],
  ["lastmonth", "Last month"],
  ["custom", "Custom"],
];

const DEFAULT_CLIENTS: EarningsClient[] = [
  { id: "nia", name: "Nia Okafor", email: "nia.okafor@gmail.com" },
  { id: "ruth", name: "Ruth Mensah", email: "ruth.mensah@outlook.com" },
  { id: "kemi", name: "Kemi Adeyemi", email: "kemi.a@icloud.com" },
  { id: "zainab", name: "Zainab Bello" },
  { id: "amara", name: "Amara Osei" },
  { id: "tola", name: "Tola Fashola" },
  { id: "chi", name: "Chidinma Eze" },
  { id: "yasmin", name: "Yasmin Diallo" },
];

const DEFAULT_SERVICES = [
  { name: "Knotless braids", price: 85, hours: 4.5 },
  { name: "Box braids", price: 70, hours: 4 },
  { name: "Silk press", price: 65, hours: 2 },
  { name: "Loc retwist", price: 55, hours: 2 },
  { name: "Cornrows", price: 45, hours: 1.5 },
  { name: "Twist out", price: 50, hours: 1.5 },
  { name: "Fulani braids", price: 80, hours: 4 },
];

/** "14 Oct 2026" */
const formatDayYear = (date: Date): string =>
  date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const getDayStart = (date: Date): Date => {
  const start = new Date(date);

  start.setHours(0, 0, 0, 0);

  return start;
};

const addWorkingDays = (date: Date, count: number): Date => {
  const next = new Date(date);
  let remaining = count;

  while (remaining > 0) {
    next.setDate(next.getDate() + 1);
    const weekday = next.getDay();

    if (weekday !== 0 && weekday !== 6) remaining--;
  }

  return next;
};

const sumOf = <T>(items: T[], getValue: (item: T) => number): number => {
  let total = 0;

  for (const item of items) total += getValue(item);

  return total;
};

export const getClient = (
  id: string,
  clients?: EarningsClient[],
): { name: string } => {
  const list = clients && clients.length ? clients : DEFAULT_CLIENTS;

  return list.find((client) => client.id === id) ?? { name: "Walk-in" };
};

/** Which ledger is current: it is rebuilt only when the scenario or the day changes. */
export const getLedgerKey = (scenario: EarningsScenario): string =>
  `${scenario}|${new Date().toDateString()}`;

const getMethodForRoll = (roll: number) => {
  if (roll < 0.34) return "Saved card";

  if (roll < 0.48) return "Payment link";

  if (roll < 0.74) return "Cash";

  if (roll < 0.85) return "Bank transfer";

  return "Own card reader";
};

const getAppointmentsPerDay = (roll: number) => {
  if (roll < 0.1) return 0;

  if (roll < 0.4) return 1;

  return roll < 0.8 ? 2 : 3;
};

export const buildLedger = (
  scenario: EarningsScenario,
  clients?: EarningsClient[],
  services?: EarningsService[],
): Ledger => {
  const now = new Date();
  const today = getDayStart(now);
  // mulberry32
  let seed = scenario === "onhold" ? 4417 : 20260930;

  const random = () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let value = Math.imul(seed ^ (seed >>> 15), 1 | seed);

    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;

    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };

  const clientList = clients && clients.length ? clients : DEFAULT_CLIENTS;

  const studioServices = (services ?? [])
    .filter(({ status, price }) => status !== "archived" && +price > 0)
    .map(({ name, price, durationHours, durationMinutes }) => ({
      name,
      price: +price,
      hours: (+(durationHours ?? 0) || 2) + (+(durationMinutes ?? 0) || 0) / 60,
    }));

  const serviceList = studioServices.length ? studioServices : DEFAULT_SERVICES;
  const transactions: Transaction[] = [];
  let count = 0;

  type NewTransaction = Omit<Transaction, "id" | "fee" | "net" | "status">;

  const add = (entry: NewTransaction): Transaction => {
    count++;
    const isCard = !entry.isRecorded;

    const isFeeable =
      isCard &&
      entry.amount > 0 &&
      (entry.method === "Saved card" || entry.method === "Payment link");

    const cardFee = isFeeable ? roundToPence(entry.amount * 0.015 + 0.2) : 0;
    const fee = entry.isRecorded ? null : cardFee;

    const transaction: Transaction = {
      id: `TX-${71200 + count}`,
      fee,
      net: roundToPence(entry.amount - (fee || 0)),
      status: "Pending",
      ...entry,
    };

    transactions.push(transaction);

    return transaction;
  };

  const SLOTS = [
    [9, 30],
    [11, 0],
    [13, 30],
    [15, 0],
    [16, 30],
  ] as const;

  interface AppointmentOptions {
    service?: { name: string; price: number; hours: number };
    clientIndex?: number;
    hold?: boolean;
    flow?: number;
    method?: string;
  }

  const appointment = (
    dayOffset: number,
    slot: number,
    options: AppointmentOptions = {},
  ) => {
    const service =
      options.service ??
      serviceList[Math.floor(random() * serviceList.length)]!;

    const clientIndex =
      options.clientIndex != null
        ? options.clientIndex
        : Math.floor(random() * clientList.length);

    const client = clientList[clientIndex % clientList.length]!;
    const [hours, minutes] = SLOTS[slot]!;
    const at = new Date(today.getTime() + dayOffset * DAY_MS);

    at.setHours(hours, minutes, 0, 0);
    const end = new Date(at.getTime() + service.hours * 3600000);

    const booked = new Date(
      at.getTime() - (2 + Math.floor(random() * 10)) * DAY_MS,
    );

    booked.setHours(
      19 + Math.floor(random() * 3),
      Math.floor(random() * 60),
      0,
      0,
    );

    const rolls = [random(), random(), random(), random(), random()] as [
      number,
      number,
      number,
      number,
      number,
    ];

    if (booked > now) return;

    const deposit = roundToPence(service.price * 0.2);
    const bookingRef = `BK-${5100 + count}`;

    const base = {
      client: client.id,
      service: service.name,
      bookingRef,
      appointment: at,
      hold: !!options.hold,
      holdUntil: new Date(end.getTime() + DAY_MS),
    };

    const flow = options.flow != null ? options.flow : rolls[0];

    if (flow < 0.1) {
      add({
        description: "Full payment",
        method: "Card online",
        at: booked,
        amount: service.price,
        ...base,
      });

      if (end <= now && rolls[3] < 0.3)
        add({
          description: "Tip",
          method: "Saved card",
          at: new Date(end.getTime() + 120000),
          amount: [5, 10, 5, 8][Math.floor(rolls[4] * 4)]!,
          ...base,
        });

      return;
    }

    if (flow < 0.14) {
      const depositTransaction = add({
        description: "Deposit",
        method: "Card online",
        at: booked,
        amount: deposit,
        ...base,
      });

      if (rolls[1] < 0.5) {
        const refundAt = new Date(
          Math.min(at.getTime() - 3 * DAY_MS, now.getTime()),
        );

        if (refundAt > booked) {
          depositTransaction.refunded = true;

          add({
            description: "Refund",
            method: "Card online",
            at: refundAt,
            amount: -deposit,
            note: "Cancelled by the client more than 48 hours before. Deposit refunded in full.",
            ...base,
          });
        }
      } else if (at <= now)
        add({
          description: "Cancellation fee",
          method: "Saved card",
          at: new Date(at.getTime() - 20 * 3600000),
          amount: roundToPence(service.price * 0.3),
          note: "Cancelled 20 hours before, inside your 48-hour window. Deposit kept and the rest of the 50% fee charged to the saved card.",
          ...base,
        });

      return;
    }

    if (flow < 0.17 && at <= now) {
      add({
        description: "Deposit",
        method: "Card online",
        at: booked,
        amount: deposit,
        ...base,
      });

      add({
        description: "No-show fee",
        method: "Saved card",
        at: new Date(at.getTime() + 15 * 60000 + 3600000),
        amount: roundToPence(service.price * 0.3),
        note: "Client didn’t arrive within the 15 minute grace period.",
        ...base,
      });

      return;
    }

    add({
      description: "Deposit",
      method: "Card online",
      at: booked,
      amount: deposit,
      ...base,
    });

    if (end > now) return;

    const method = options.method || getMethodForRoll(rolls[1]);

    const isRecorded =
      method === "Cash" ||
      method === "Bank transfer" ||
      method === "Own card reader";

    add({
      description: "Balance",
      method,
      isRecorded,
      at: new Date(end.getTime() + 60000),
      amount: roundToPence(service.price - deposit),
      ...base,
    });

    if (rolls[2] < 0.3)
      add({
        description: "Tip",
        method,
        isRecorded,
        at: new Date(end.getTime() + 90000),
        amount: [5, 10, 5, 8, 15][Math.floor(rolls[3] * 5)]!,
        ...base,
      });

    if (!isRecorded && rolls[4] < 0.05) {
      const refundAt = new Date(end.getTime() + 2 * DAY_MS);

      if (refundAt <= now)
        add({
          description: "Refund",
          method,
          at: refundAt,
          amount: -roundToPence((service.price - deposit) * 0.5),
          note: "Partial refund. Client asked for a touch-up that couldn’t be booked in time.",
          ...base,
        });
    }
  };

  if (scenario === "onhold") {
    const fixed: [number, number, AppointmentOptions][] = [
      [-9, 1, { clientIndex: 0, method: "Saved card" }],
      [-6, 2, { clientIndex: 2, method: "Cash" }],
      [-3, 0, { clientIndex: 1, method: "Payment link" }],
      [-1, 3, { clientIndex: 4, method: "Saved card", hold: true }],
      [2, 1, { clientIndex: 3, hold: true }],
      [4, 2, { clientIndex: 6, hold: true }],
    ];

    for (const [dayOffset, slot, options] of fixed) {
      options.flow = 0.5;
      options.service = serviceList[options.clientIndex! % serviceList.length];
      appointment(dayOffset, slot, options);
    }
  } else if (scenario !== "empty" && scenario !== "setup") {
    for (let dayOffset = -130; dayOffset <= 10; dayOffset++) {
      const day = new Date(today.getTime() + dayOffset * DAY_MS);
      const weekday = day.getDay();

      if (weekday === 0 || weekday === 1) continue;

      const roll = random();
      const perDay = getAppointmentsPerDay(roll);
      const used: Record<number, boolean> = {};

      for (let index = 0; index < perDay; index++) {
        let slot = Math.floor(random() * 5);

        while (used[slot]) slot = (slot + 1) % 5;

        used[slot] = true;
        appointment(dayOffset, slot);
      }
    }
  }

  transactions.sort(
    (first, second) => second.at.getTime() - first.at.getTime(),
  );

  const byDay: Record<number, Transaction[]> = {};

  for (const transaction of transactions) {
    const age = Math.round(
      (today.getTime() - getDayStart(transaction.at).getTime()) / DAY_MS,
    );

    if (transaction.isRecorded) {
      transaction.status = "Recorded";
      continue;
    }

    if (
      transaction.hold &&
      transaction.holdUntil &&
      now < transaction.holdUntil
    ) {
      transaction.status = "On hold";
      continue;
    }

    if (transaction.hold) transaction.hold = false;

    if (age <= 1) {
      transaction.status = transaction.refunded ? "Refunded" : "Pending";
      continue;
    }

    if (age === 2) {
      transaction.status = transaction.refunded ? "Refunded" : "Available";
      continue;
    }

    const dayKey = getDayStart(transaction.at).getTime();

    (byDay[dayKey] = byDay[dayKey] ?? []).push(transaction);
    transaction.status = transaction.refunded ? "Refunded" : "Paid out";
  }

  const payouts: Payout[] = [];

  if (scenario !== "onhold") {
    Object.keys(byDay)
      .map(Number)
      .sort((first, second) => second - first)
      .forEach((dayKey, index) => {
        const items = byDay[dayKey]!;
        const sent = new Date(dayKey + 3 * DAY_MS);

        sent.setHours(8, 0, 0, 0);
        const arrive = addWorkingDays(sent, 1);

        const gross = roundToPence(
          sumOf(
            items.filter(({ amount }) => amount > 0),
            ({ amount }) => amount,
          ),
        );

        const fees = roundToPence(sumOf(items, ({ fee }) => fee || 0));

        const refunds = roundToPence(
          sumOf(
            items.filter(({ amount }) => amount < 0),
            ({ amount }) => amount,
          ),
        );

        const amount = roundToPence(gross - fees + refunds);
        const id = `PO-${38800 - index}`;

        const status: PayoutState =
          getDayStart(arrive) <= today ? "Paid" : "In transit";

        for (const item of items) item.payoutId = id;

        if (amount > 0)
          payouts.push({
            id,
            amount,
            gross,
            fees,
            refunds,
            sent,
            arrive,
            status,
            items,
            from: new Date(dayKey),
          });
      });
  } else {
    for (const transaction of transactions)
      if (transaction.status === "Paid out") transaction.status = "Available";
  }

  if (scenario === "default") {
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const failed =
      payouts.find(
        ({ sent, status }) =>
          sent < now && sent >= monthStart && status === "Paid",
      ) ?? payouts.find(({ sent }) => sent < now);

    if (failed) {
      failed.status = "Failed";

      for (const item of failed.items) {
        if (item.status === "Paid out") item.status = "Available";

        item.payoutId = failed.id;
      }
    }
  }

  const sumStatus = (status: TransactionStatus) =>
    roundToPence(
      sumOf(
        transactions.filter(
          (item) => item.status === status && !item.isRecorded,
        ),
        ({ net }) => net,
      ),
    );

  let available = sumStatus("Available");
  const pending = sumStatus("Pending");
  const onHold = sumStatus("On hold");
  let pausedAmount = 0;

  if (scenario === "paused") {
    const disputed =
      transactions.find(
        ({ description, status }) =>
          description === "Full payment" && status === "Paid out",
      ) ?? transactions.find(({ status }) => status === "Paid out");

    const amount = roundToPence(available + 62.4);
    const at = new Date(now.getTime() - 5 * 3600000);

    const disputedOn = disputed
      ? formatWeekdayDate(disputed.at)
      : "an earlier payment";

    transactions.unshift({
      id: `TX-${71200 + ++count}`,
      description: "Adjustment (recovery)",
      method: "Balance deduction",
      at,
      amount: -amount,
      fee: 0,
      net: -amount,
      status: "Available",
      client: disputed ? disputed.client : "nia",
      service: disputed ? disputed.service : "Knotless braids",
      bookingRef: disputed ? disputed.bookingRef : "BK-5100",
      appointment: disputed ? disputed.appointment : at,
      note: `The client’s bank upheld a dispute on ${disputedOn}. We’re recovering the amount from your balance before payouts resume.`,
    });

    pausedAmount = 62.4;
    available = 0;
  }

  if (available < 0) available = 0;

  const nextDate =
    available > 0 && scenario !== "paused" ? addWorkingDays(today, 1) : null;

  return {
    transactions,
    payouts,
    available,
    pending,
    onHold,
    pausedAmount,
    nextDate,
    today,
    scenario,
  };
};

/** The period's [start, end); week starts on Monday. */
export const getRange = (
  period: PeriodId,
  from?: string,
  to?: string,
): DateRange => {
  const today = getDayStart(new Date());
  const year = today.getFullYear();
  const month = today.getMonth();

  if (period === "month")
    return {
      start: new Date(year, month, 1),
      end: new Date(year, month + 1, 1),
    };

  if (period === "lastmonth")
    return {
      start: new Date(year, month - 1, 1),
      end: new Date(year, month, 1),
    };

  if (period === "custom" && from && to) {
    const start = new Date(`${from}T00:00:00`);
    const end = new Date(`${to}T00:00:00`);

    end.setDate(end.getDate() + 1);

    return { start, end };
  }

  const start = new Date(today);

  start.setDate(start.getDate() - ((today.getDay() + 6) % 7));
  const end = new Date(start);

  end.setDate(end.getDate() + 7);

  return { start, end };
};

/** "5 Oct – 11 Oct 2026" */
export const getRangeLabel = ({ start, end }: DateRange): string => {
  const last = new Date(end.getTime() - DAY_MS);
  const isSameYear = start.getFullYear() === last.getFullYear();

  const startLabel = start.toLocaleDateString(
    "en-GB",
    isSameYear
      ? { day: "numeric", month: "short" }
      : { day: "numeric", month: "short", year: "numeric" },
  );

  return `${startLabel} – ${formatDayYear(last)}`;
};

interface Bucket {
  start: Date;
  end: Date;
  label: string;
  long: string;
}

/** Chart buckets: days up to two weeks, weeks up to ~3 months, else months. */
export const getBuckets = ({
  start: rangeStart,
  end: rangeEnd,
}: DateRange): { title: string; buckets: Bucket[] } => {
  const days = Math.round((rangeEnd.getTime() - rangeStart.getTime()) / DAY_MS);
  const buckets: Bucket[] = [];

  if (days <= 14) {
    for (let index = 0; index < days; index++) {
      const start = new Date(rangeStart.getTime() + index * DAY_MS);

      start.setHours(0, 0, 0, 0);
      const end = new Date(start);

      end.setDate(end.getDate() + 1);

      buckets.push({
        start,
        end,
        label:
          days <= 7
            ? start.toLocaleDateString("en-GB", { weekday: "short" })
            : String(start.getDate()),
        long: formatWeekdayDate(start),
      });
    }

    return { title: "Takings by day", buckets };
  }

  if (days <= 100) {
    let start = new Date(rangeStart);

    while (start < rangeEnd) {
      const end = new Date(start);

      end.setDate(end.getDate() + 7);
      const clipped = end > rangeEnd ? rangeEnd : end;
      const last = new Date(clipped.getTime() - DAY_MS);
      const startMonth = start.toLocaleDateString("en-GB", { month: "short" });

      const lastDay = last.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
      });

      buckets.push({
        start: new Date(start),
        end: clipped,
        label: `${start.getDate()} ${startMonth}`,
        long: `${start.getDate()} – ${lastDay}`,
      });

      start = clipped;
    }

    return { title: "Weekly takings", buckets };
  }

  let start = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 1);

  while (start < rangeEnd) {
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);

    buckets.push({
      start: new Date(Math.max(start.getTime(), rangeStart.getTime())),
      end: end > rangeEnd ? rangeEnd : end,
      label: start.toLocaleDateString("en-GB", { month: "short" }),
      long: start.toLocaleDateString("en-GB", {
        month: "long",
        year: "numeric",
      }),
    });

    start = end;
  }

  return { title: "Monthly takings", buckets };
};

interface PeriodStats {
  takings: number;
  fees: number;
  refunds: number;
  net: number;
}

export const getStats = (transactions: Transaction[]): PeriodStats => {
  const takings = roundToPence(
    sumOf(
      transactions.filter(({ amount }) => amount > 0),
      ({ amount }) => amount,
    ),
  );

  const fees = roundToPence(sumOf(transactions, ({ fee }) => fee || 0));

  const refunds = roundToPence(
    sumOf(
      transactions.filter(({ amount }) => amount < 0),
      ({ amount }) => amount,
    ),
  );

  return {
    takings,
    fees,
    refunds,
    net: roundToPence(takings - fees + refunds),
  };
};

export const getTakings = (
  transactions: Transaction[],
  start: Date,
  end: Date,
): number =>
  roundToPence(
    sumOf(
      transactions.filter(
        ({ at, amount }) => at >= start && at < end && amount > 0,
      ),
      ({ amount }) => amount,
    ),
  );

export const getMethodLabel = ({ isRecorded, method }: Transaction): string =>
  isRecorded ? `Recorded · ${method}` : method;

/** Status tag colours: [background, text]. */
export const STATUS_COLOURS: Record<
  TransactionStatus | PayoutState,
  [string, string]
> = {
  Pending: ["var(--fill-quiet)", "var(--neutral-600)"],
  Available: ["rgba(47,122,77,.1)", "#2f7a4d"],
  "On hold": ["rgba(181,84,31,.1)", "#9a4516"],
  "Paid out": ["rgba(26,23,20,.07)", "var(--text-primary)"],
  Refunded: ["var(--accent-wash)", "var(--accent-700)"],
  Recorded: ["var(--fill-quiet)", "var(--neutral-600)"],
  Paid: ["rgba(47,122,77,.1)", "#2f7a4d"],
  "In transit": ["rgba(26,23,20,.07)", "var(--text-primary)"],
  Failed: ["rgba(143,17,18,.1)", "var(--accent-700)"],
};
