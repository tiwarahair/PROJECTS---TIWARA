import { roundToPence } from "../../utils/money";
import { DEFAULT_CLIENTS } from "./data";
import type {
  EarningsClient,
  EarningsScenario,
  PeriodStats,
  Transaction,
} from "./data";

export const sumOf = <T>(items: T[], getValue: (item: T) => number): number => {
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

export const getClientList = (clients?: EarningsClient[]) =>
  clients && clients.length ? clients : DEFAULT_CLIENTS;

export const getClient = (
  id: string,
  clients?: EarningsClient[],
): { name: string } =>
  getClientList(clients).find((client) => client.id === id) ?? {
    name: "Walk-in",
  };

/** Which ledger is current: it is rebuilt only when the scenario or the day changes. */
export const getLedgerKey = (scenario: EarningsScenario): string =>
  `${scenario}|${new Date().toDateString()}`;

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
