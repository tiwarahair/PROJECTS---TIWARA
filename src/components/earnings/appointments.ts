import { roundToPence } from "../../utils/money";
import { DAY_MS, SLOTS } from "./data";
import type {
  AppointmentOptions,
  EarningsScenario,
  LedgerContext,
  Transaction,
  TransactionLog,
  Visit,
} from "./data";
import { addCancellation, addFullPayment, addNoShow, addVisit } from "./visits";

export const createRandom = (initialSeed: number) => {
  // mulberry32
  let seed = initialSeed;

  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let value = Math.imul(seed ^ (seed >>> 15), 1 | seed);

    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;

    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
};

export const createTransactionLog = (): TransactionLog => {
  const log: TransactionLog = {
    transactions: [],
    count: 0,
    add: (entry) => {
      log.count++;
      const isCard = !entry.isRecorded;

      const isFeeable =
        isCard &&
        entry.amount > 0 &&
        (entry.method === "Saved card" || entry.method === "Payment link");

      const cardFee = isFeeable ? roundToPence(entry.amount * 0.015 + 0.2) : 0;
      const fee = entry.isRecorded ? null : cardFee;

      const transaction: Transaction = {
        id: `TX-${71200 + log.count}`,
        fee,
        net: roundToPence(entry.amount - (fee || 0)),
        status: "Pending",
        ...entry,
      };

      log.transactions.push(transaction);

      return transaction;
    },
  };

  return log;
};

const getAppointmentsPerDay = (roll: number) => {
  if (roll < 0.1) return 0;

  if (roll < 0.4) return 1;

  return roll < 0.8 ? 2 : 3;
};

const addAppointment = (
  context: LedgerContext,
  dayOffset: number,
  slot: number,
  options: AppointmentOptions = {},
) => {
  const { now, today, random, log, clientList, serviceList } = context;

  const service =
    options.service ?? serviceList[Math.floor(random() * serviceList.length)]!;

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

  const visit: Visit = {
    service,
    at,
    end,
    booked,
    rolls,
    deposit: roundToPence(service.price * 0.2),
    base: {
      client: client.id,
      service: service.name,
      bookingRef: `BK-${5100 + log.count}`,
      appointment: at,
      hold: !!options.hold,
      holdUntil: new Date(end.getTime() + DAY_MS),
    },
  };

  const flow = options.flow != null ? options.flow : rolls[0];

  if (flow < 0.1) return addFullPayment(context, visit);

  if (flow < 0.14) return addCancellation(context, visit);

  if (flow < 0.17 && at <= now) return addNoShow(context, visit);

  addVisit(context, visit, options);
};

export const addAppointments = (
  scenario: EarningsScenario,
  context: LedgerContext,
) => {
  const { today, random, serviceList } = context;

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
      addAppointment(context, dayOffset, slot, options);
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
        addAppointment(context, dayOffset, slot);
      }
    }
  }
};
