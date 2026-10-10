// Earnings demo ledger and its date helpers (prototype Earnings.dc.html: build, r2, gbp, fd, fdy, hm, day0, addWD, iso,
// range, rangeLabel, buckets, stats). The ledger is generated from a seeded random sequence, so it is the same on every
// load of the same day.

export type EarningsScenario =
  "default" | "onhold" | "paused" | "setup" | "empty";
export type TxStatus =
  "Pending" | "Available" | "On hold" | "Paid out" | "Refunded" | "Recorded";
export type PayoutState = "Paid" | "In transit" | "Failed";
export type PeriodId = "week" | "month" | "lastmonth" | "custom";

export interface EarningsClient {
  id: string;
  name: string;
  email?: string;
}

/** A Studio service (only the fields the ledger reads). */
export interface EarningsService {
  name: string;
  price: number | string;
  st?: string;
  durH?: number | string;
  durM?: number | string;
}

export interface Transaction {
  id: string;
  client: string;
  svc: string;
  bref: string;
  appt: Date;
  desc: string;
  method: string;
  at: Date;
  amount: number;
  fee: number | null;
  net: number;
  status: TxStatus;
  rec?: boolean;
  hold?: boolean;
  holdUntil?: Date;
  refunded?: boolean;
  note?: string;
  po?: string;
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
  tx: Transaction[];
  payouts: Payout[];
  available: number;
  pending: number;
  onHold: number;
  pausedAmt: number;
  nextDate: Date | null;
  T0: Date;
  sc: EarningsScenario;
}

export interface DateRange {
  s: Date;
  e: Date;
}

const DAY_MS = 86400000;

export const PERIODS: [PeriodId, string][] = [
  ["week", "This week"],
  ["month", "This month"],
  ["lastmonth", "Last month"],
  ["custom", "Custom"],
];

export const DEFAULT_CLIENTS: EarningsClient[] = [
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
  { name: "Knotless braids", price: 85, h: 4.5 },
  { name: "Box braids", price: 70, h: 4 },
  { name: "Silk press", price: 65, h: 2 },
  { name: "Loc retwist", price: 55, h: 2 },
  { name: "Cornrows", price: 45, h: 1.5 },
  { name: "Twist out", price: 50, h: 1.5 },
  { name: "Fulani braids", price: 80, h: 4 },
];

export const roundMoney = (value: number): number =>
  Math.round(value * 100) / 100;

/** "£1,234.50", "−£12.00" */
export const formatGbp = (value: number): string => {
  const rounded = roundMoney(value);
  return (
    (rounded < 0 ? "−" : "") +
    "£" +
    Math.abs(rounded).toLocaleString("en-GB", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
};

/** "Wed 14 Oct" */
export const formatDay = (date: Date): string =>
  date.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

/** "14 Oct 2026" */
export const formatDayYear = (date: Date): string =>
  date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

export const formatTime = (date: Date): string =>
  String(date.getHours()).padStart(2, "0") +
  ":" +
  String(date.getMinutes()).padStart(2, "0");

export const getDayStart = (date: Date): Date => {
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

export const toIsoDate = (date: Date): string =>
  date.getFullYear() +
  "-" +
  String(date.getMonth() + 1).padStart(2, "0") +
  "-" +
  String(date.getDate()).padStart(2, "0");

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

/** Which ledger is current: the prototype rebuilds only when the scenario or the day changes. */
export const getLedgerKey = (scenario: EarningsScenario): string =>
  scenario + "|" + new Date().toDateString();

/** The demo ledger for a scenario (prototype build()). */
export const buildLedger = (
  scenario: EarningsScenario,
  clients?: EarningsClient[],
  services?: EarningsService[],
): Ledger => {
  const now = new Date();
  const T0 = getDayStart(now);
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
    .filter(({ st, price }) => st !== "archived" && +price > 0)
    .map(({ name, price, durH, durM }) => ({
      name,
      price: +price,
      h: (+(durH ?? 0) || 2) + (+(durM ?? 0) || 0) / 60,
    }));
  const serviceList = studioServices.length ? studioServices : DEFAULT_SERVICES;
  const tx: Transaction[] = [];
  let count = 0;

  type NewTx = Omit<Transaction, "id" | "fee" | "net" | "status">;
  const add = (entry: NewTx): Transaction => {
    count++;
    const isCard = !entry.rec;
    const isFeeable =
      isCard &&
      entry.amount > 0 &&
      (entry.method === "Saved card" || entry.method === "Payment link");
    const fee = entry.rec
      ? null
      : isFeeable
        ? roundMoney(entry.amount * 0.015 + 0.2)
        : 0;
    const transaction: Transaction = {
      id: "TX-" + (71200 + count),
      fee,
      net: roundMoney(entry.amount - (fee || 0)),
      status: "Pending",
      ...entry,
    };
    tx.push(transaction);
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
    sv?: { name: string; price: number; h: number };
    ci?: number;
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
      options.sv ?? serviceList[Math.floor(random() * serviceList.length)]!;
    const clientIndex =
      options.ci != null
        ? options.ci
        : Math.floor(random() * clientList.length);
    const client = clientList[clientIndex % clientList.length]!;
    const [hours, minutes] = SLOTS[slot]!;
    const at = new Date(T0.getTime() + dayOffset * DAY_MS);
    at.setHours(hours, minutes, 0, 0);
    const end = new Date(at.getTime() + service.h * 3600000);
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
    const deposit = roundMoney(service.price * 0.2);
    const bookingRef = "BK-" + (5100 + count);
    const base = {
      client: client.id,
      svc: service.name,
      bref: bookingRef,
      appt: at,
      hold: !!options.hold,
      holdUntil: new Date(end.getTime() + DAY_MS),
    };
    const flow = options.flow != null ? options.flow : rolls[0];
    if (flow < 0.1) {
      add({
        desc: "Full payment",
        method: "Card online",
        at: booked,
        amount: service.price,
        ...base,
      });
      if (end <= now && rolls[3] < 0.3)
        add({
          desc: "Tip",
          method: "Saved card",
          at: new Date(end.getTime() + 120000),
          amount: [5, 10, 5, 8][Math.floor(rolls[4] * 4)]!,
          ...base,
        });
      return;
    }
    if (flow < 0.14) {
      const depositTx = add({
        desc: "Deposit",
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
          depositTx.refunded = true;
          add({
            desc: "Refund",
            method: "Card online",
            at: refundAt,
            amount: -deposit,
            note: "Cancelled by the client more than 48 hours before. Deposit refunded in full.",
            ...base,
          });
        }
      } else if (at <= now)
        add({
          desc: "Cancellation fee",
          method: "Saved card",
          at: new Date(at.getTime() - 20 * 3600000),
          amount: roundMoney(service.price * 0.3),
          note: "Cancelled 20 hours before, inside your 48-hour window. Deposit kept and the rest of the 50% fee charged to the saved card.",
          ...base,
        });
      return;
    }
    if (flow < 0.17 && at <= now) {
      add({
        desc: "Deposit",
        method: "Card online",
        at: booked,
        amount: deposit,
        ...base,
      });
      add({
        desc: "No-show fee",
        method: "Saved card",
        at: new Date(at.getTime() + 15 * 60000 + 3600000),
        amount: roundMoney(service.price * 0.3),
        note: "Client didn’t arrive within the 15 minute grace period.",
        ...base,
      });
      return;
    }
    add({
      desc: "Deposit",
      method: "Card online",
      at: booked,
      amount: deposit,
      ...base,
    });
    if (end > now) return;
    const method =
      options.method ||
      (rolls[1] < 0.34
        ? "Saved card"
        : rolls[1] < 0.48
          ? "Payment link"
          : rolls[1] < 0.74
            ? "Cash"
            : rolls[1] < 0.85
              ? "Bank transfer"
              : "Own card reader");
    const isRecorded =
      method === "Cash" ||
      method === "Bank transfer" ||
      method === "Own card reader";
    add({
      desc: "Balance",
      method,
      rec: isRecorded,
      at: new Date(end.getTime() + 60000),
      amount: roundMoney(service.price - deposit),
      ...base,
    });
    if (rolls[2] < 0.3)
      add({
        desc: "Tip",
        method,
        rec: isRecorded,
        at: new Date(end.getTime() + 90000),
        amount: [5, 10, 5, 8, 15][Math.floor(rolls[3] * 5)]!,
        ...base,
      });
    if (!isRecorded && rolls[4] < 0.05) {
      const refundAt = new Date(end.getTime() + 2 * DAY_MS);
      if (refundAt <= now)
        add({
          desc: "Refund",
          method,
          at: refundAt,
          amount: -roundMoney((service.price - deposit) * 0.5),
          note: "Partial refund. Client asked for a touch-up that couldn’t be booked in time.",
          ...base,
        });
    }
  };

  if (scenario === "onhold") {
    const fixed: [number, number, AppointmentOptions][] = [
      [-9, 1, { ci: 0, method: "Saved card" }],
      [-6, 2, { ci: 2, method: "Cash" }],
      [-3, 0, { ci: 1, method: "Payment link" }],
      [-1, 3, { ci: 4, method: "Saved card", hold: true }],
      [2, 1, { ci: 3, hold: true }],
      [4, 2, { ci: 6, hold: true }],
    ];
    for (const [dayOffset, slot, options] of fixed) {
      options.flow = 0.5;
      options.sv = serviceList[options.ci! % serviceList.length];
      appointment(dayOffset, slot, options);
    }
  } else if (scenario !== "empty" && scenario !== "setup") {
    for (let dayOffset = -130; dayOffset <= 10; dayOffset++) {
      const day = new Date(T0.getTime() + dayOffset * DAY_MS);
      const weekday = day.getDay();
      if (weekday === 0 || weekday === 1) continue;
      const roll = random();
      const perDay = roll < 0.1 ? 0 : roll < 0.4 ? 1 : roll < 0.8 ? 2 : 3;
      const used: Record<number, boolean> = {};
      for (let index = 0; index < perDay; index++) {
        let slot = Math.floor(random() * 5);
        while (used[slot]) slot = (slot + 1) % 5;
        used[slot] = true;
        appointment(dayOffset, slot);
      }
    }
  }

  tx.sort((first, second) => second.at.getTime() - first.at.getTime());
  const byDay: Record<number, Transaction[]> = {};
  for (const transaction of tx) {
    const age = Math.round(
      (T0.getTime() - getDayStart(transaction.at).getTime()) / DAY_MS,
    );
    if (transaction.rec) {
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
        const gross = roundMoney(
          sumOf(
            items.filter(({ amount }) => amount > 0),
            ({ amount }) => amount,
          ),
        );
        const fees = roundMoney(sumOf(items, ({ fee }) => fee || 0));
        const refunds = roundMoney(
          sumOf(
            items.filter(({ amount }) => amount < 0),
            ({ amount }) => amount,
          ),
        );
        const amount = roundMoney(gross - fees + refunds);
        const id = "PO-" + (38800 - index);
        const status: PayoutState =
          getDayStart(arrive) <= T0 ? "Paid" : "In transit";
        for (const item of items) item.po = id;
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
    for (const transaction of tx)
      if (transaction.status === "Paid out") transaction.status = "Available";
  }

  if (scenario === "default") {
    const monthStart = new Date(T0.getFullYear(), T0.getMonth(), 1);
    const failed =
      payouts.find(
        ({ sent, status }) =>
          sent < now && sent >= monthStart && status === "Paid",
      ) ?? payouts.find(({ sent }) => sent < now);
    if (failed) {
      failed.status = "Failed";
      for (const item of failed.items) {
        if (item.status === "Paid out") item.status = "Available";
        item.po = failed.id;
      }
    }
  }

  const sumStatus = (status: TxStatus) =>
    roundMoney(
      sumOf(
        tx.filter((item) => item.status === status && !item.rec),
        ({ net }) => net,
      ),
    );
  let available = sumStatus("Available");
  const pending = sumStatus("Pending");
  const onHold = sumStatus("On hold");
  let pausedAmt = 0;
  if (scenario === "paused") {
    const disputed =
      tx.find(
        ({ desc, status }) => desc === "Full payment" && status === "Paid out",
      ) ?? tx.find(({ status }) => status === "Paid out");
    const amount = roundMoney(available + 62.4);
    const at = new Date(now.getTime() - 5 * 3600000);
    tx.unshift({
      id: "TX-" + (71200 + ++count),
      desc: "Adjustment (recovery)",
      method: "Balance deduction",
      at,
      amount: -amount,
      fee: 0,
      net: -amount,
      status: "Available",
      client: disputed ? disputed.client : "nia",
      svc: disputed ? disputed.svc : "Knotless braids",
      bref: disputed ? disputed.bref : "BK-5100",
      appt: disputed ? disputed.appt : at,
      note:
        "The client’s bank upheld a dispute on " +
        (disputed ? formatDay(disputed.at) : "an earlier payment") +
        ". We’re recovering the amount from your balance before payouts resume.",
    });
    pausedAmt = 62.4;
    available = 0;
  }
  if (available < 0) available = 0;
  const nextDate =
    available > 0 && scenario !== "paused" ? addWorkingDays(T0, 1) : null;
  return {
    tx,
    payouts,
    available,
    pending,
    onHold,
    pausedAmt,
    nextDate,
    T0,
    sc: scenario,
  };
};

/** The period's [start, end) (prototype range()); week starts on Monday. */
export const getRange = (
  period: PeriodId,
  from?: string,
  to?: string,
): DateRange => {
  const T0 = getDayStart(new Date());
  const year = T0.getFullYear();
  const month = T0.getMonth();
  if (period === "month")
    return { s: new Date(year, month, 1), e: new Date(year, month + 1, 1) };
  if (period === "lastmonth")
    return { s: new Date(year, month - 1, 1), e: new Date(year, month, 1) };
  if (period === "custom" && from && to) {
    const start = new Date(from + "T00:00:00");
    const end = new Date(to + "T00:00:00");
    end.setDate(end.getDate() + 1);
    return { s: start, e: end };
  }
  const start = new Date(T0);
  start.setDate(start.getDate() - ((T0.getDay() + 6) % 7));
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return { s: start, e: end };
};

/** "5 Oct – 11 Oct 2026" */
export const getRangeLabel = ({ s, e }: DateRange): string => {
  const last = new Date(e.getTime() - DAY_MS);
  const isSameYear = s.getFullYear() === last.getFullYear();
  return (
    s.toLocaleDateString(
      "en-GB",
      isSameYear
        ? { day: "numeric", month: "short" }
        : { day: "numeric", month: "short", year: "numeric" },
    ) +
    " – " +
    formatDayYear(last)
  );
};

export interface Bucket {
  s: Date;
  e: Date;
  label: string;
  long: string;
}

/** Chart buckets: days up to two weeks, weeks up to ~3 months, else months. */
export const getBuckets = ({
  s: rangeStart,
  e: rangeEnd,
}: DateRange): { title: string; b: Bucket[] } => {
  const days = Math.round((rangeEnd.getTime() - rangeStart.getTime()) / DAY_MS);
  const buckets: Bucket[] = [];
  if (days <= 14) {
    for (let index = 0; index < days; index++) {
      const start = new Date(rangeStart.getTime() + index * DAY_MS);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      buckets.push({
        s: start,
        e: end,
        label:
          days <= 7
            ? start.toLocaleDateString("en-GB", { weekday: "short" })
            : String(start.getDate()),
        long: formatDay(start),
      });
    }
    return { title: "Takings by day", b: buckets };
  }
  if (days <= 100) {
    let start = new Date(rangeStart);
    while (start < rangeEnd) {
      const end = new Date(start);
      end.setDate(end.getDate() + 7);
      const clipped = end > rangeEnd ? rangeEnd : end;
      const last = new Date(clipped.getTime() - DAY_MS);
      buckets.push({
        s: new Date(start),
        e: clipped,
        label:
          start.getDate() +
          " " +
          start.toLocaleDateString("en-GB", { month: "short" }),
        long:
          start.getDate() +
          " – " +
          last.toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
      });
      start = clipped;
    }
    return { title: "Weekly takings", b: buckets };
  }
  let start = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 1);
  while (start < rangeEnd) {
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
    buckets.push({
      s: new Date(Math.max(start.getTime(), rangeStart.getTime())),
      e: end > rangeEnd ? rangeEnd : end,
      label: start.toLocaleDateString("en-GB", { month: "short" }),
      long: start.toLocaleDateString("en-GB", {
        month: "long",
        year: "numeric",
      }),
    });
    start = end;
  }
  return { title: "Monthly takings", b: buckets };
};

export interface PeriodStats {
  takings: number;
  fees: number;
  refunds: number;
  net: number;
}

export const getStats = (transactions: Transaction[]): PeriodStats => {
  const takings = roundMoney(
    sumOf(
      transactions.filter(({ amount }) => amount > 0),
      ({ amount }) => amount,
    ),
  );
  const fees = roundMoney(sumOf(transactions, ({ fee }) => fee || 0));
  const refunds = roundMoney(
    sumOf(
      transactions.filter(({ amount }) => amount < 0),
      ({ amount }) => amount,
    ),
  );
  return { takings, fees, refunds, net: roundMoney(takings - fees + refunds) };
};

export const getTakings = (
  transactions: Transaction[],
  start: Date,
  end: Date,
): number =>
  roundMoney(
    sumOf(
      transactions.filter(
        ({ at, amount }) => at >= start && at < end && amount > 0,
      ),
      ({ amount }) => amount,
    ),
  );

export const getMethodLabel = ({ rec, method }: Transaction): string =>
  rec ? "Recorded · " + method : method;

/** Status tag colours (prototype STT): [background, text]. */
export const STATUS_COLOURS: Record<TxStatus | PayoutState, [string, string]> =
  {
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
