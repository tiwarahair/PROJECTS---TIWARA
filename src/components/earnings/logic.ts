import { roundToPence } from "../../utils/money";
import type { EarningsClient, Ledger, PeriodStats, Transaction } from "./data";

const sumOf = <T>(items: T[], getValue: (item: T) => number): number => {
  let total = 0;

  for (const item of items) total += getValue(item);

  return total;
};

export const getTotals = (items: Transaction[]) => {
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

  return { gross, fees, refunds, net: roundToPence(gross - fees + refunds) };
};

export const getClient = (
  id: string,
  clients?: EarningsClient[],
): { name: string } =>
  (clients ?? []).find((client) => client.id === id) ?? {
    name: "Walk-in",
  };

export const getStats = (transactions: Transaction[]): PeriodStats => {
  const { gross, fees, refunds, net } = getTotals(transactions);

  return { takings: gross, fees, refunds, net };
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

/** A failed payout's link opens the stylist's own Stripe when Studio gives a way to */
export const openUpdateBank = (
  event: { preventDefault: () => void },
  onUpdateBank?: () => void,
) => {
  if (!onUpdateBank) return;

  event.preventDefault();
  onUpdateBank();
};

export const getPausedCauses = ({ transactions, payouts }: Ledger) => {
  const lastPaid = payouts.find(({ status }) => status === "Paid");
  const ids = new Set(transactions.map(({ id }) => id));

  const isReturned = (id: string) =>
    id.startsWith("dispute:") &&
    ids.has(id.replace("dispute:", "dispute-return:"));

  return transactions.filter(
    ({ id, amount, isRecorded, status, at }) =>
      amount < 0 &&
      !isRecorded &&
      status !== "Paid out" &&
      !isReturned(id) &&
      (!lastPaid || at >= lastPaid.sent),
  );
};
