// Earnings demo ledger and its date helpers. The ledger is generated from a seeded random sequence, so it is the same on every
// load of the same day.
import { roundToPence } from "../../utils/money";
import { formatWeekdayDate } from "../../utils/dates";
import {
  addAppointments,
  createRandom,
  createTransactionLog,
} from "./appointments";
import { DAY_MS, DEFAULT_SERVICES } from "./data";
import type {
  EarningsClient,
  EarningsScenario,
  EarningsService,
  Ledger,
  Payout,
  PayoutState,
  Transaction,
  TransactionLog,
  TransactionStatus,
} from "./data";
import { addWorkingDays, getDayStart } from "./dates";
import { getClientList, getTotals, sumOf } from "./logic";

const getServiceList = (services?: EarningsService[]) => {
  const studioServices = (services ?? [])
    .filter(({ status, price }) => status !== "archived" && +price > 0)
    .map(({ name, price, durationHours, durationMinutes }) => ({
      name,
      price: +price,
      hours: (+(durationHours ?? 0) || 2) + (+(durationMinutes ?? 0) || 0) / 60,
    }));

  return studioServices.length ? studioServices : DEFAULT_SERVICES;
};

const settleTransactions = (
  transactions: Transaction[],
  now: Date,
  today: Date,
) => {
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

  return byDay;
};

const getPayouts = (byDay: Record<number, Transaction[]>, today: Date) => {
  const payouts: Payout[] = [];

  Object.keys(byDay)
    .map(Number)
    .sort((first, second) => second - first)
    .forEach((dayKey, index) => {
      const items = byDay[dayKey]!;
      const sent = new Date(dayKey + 3 * DAY_MS);

      sent.setHours(8, 0, 0, 0);
      const arrive = addWorkingDays(sent, 1);
      const { gross, fees, refunds, net: amount } = getTotals(items);
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

  return payouts;
};

const failPayout = (payouts: Payout[], now: Date, today: Date) => {
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const failed =
    payouts.find(
      ({ sent, status }) =>
        sent < now && sent >= monthStart && status === "Paid",
    ) ?? payouts.find(({ sent }) => sent < now);

  if (!failed) return;

  failed.status = "Failed";

  for (const item of failed.items) {
    if (item.status === "Paid out") item.status = "Available";

    item.payoutId = failed.id;
  }
};

const addRecovery = (log: TransactionLog, available: number, now: Date) => {
  const { transactions } = log;

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
    id: `TX-${71200 + ++log.count}`,
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
};

export const buildLedger = (
  scenario: EarningsScenario,
  clients?: EarningsClient[],
  services?: EarningsService[],
): Ledger => {
  const now = new Date();
  const today = getDayStart(now);
  const log = createTransactionLog();
  const { transactions } = log;

  addAppointments(scenario, {
    now,
    today,
    random: createRandom(scenario === "onhold" ? 4417 : 20260930),
    log,
    clientList: getClientList(clients),
    serviceList: getServiceList(services),
  });

  transactions.sort(
    (first, second) => second.at.getTime() - first.at.getTime(),
  );

  const byDay = settleTransactions(transactions, now, today);
  const payouts = scenario !== "onhold" ? getPayouts(byDay, today) : [];

  if (scenario === "onhold")
    for (const transaction of transactions)
      if (transaction.status === "Paid out") transaction.status = "Available";

  if (scenario === "default") failPayout(payouts, now, today);

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
    addRecovery(log, available, now);
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
