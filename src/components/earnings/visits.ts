import { roundToPence } from "../../utils/money";
import { DAY_MS } from "./data";
import type { AppointmentOptions, LedgerContext, Visit } from "./data";

const getMethodForRoll = (roll: number) => {
  if (roll < 0.34) return "Saved card";

  if (roll < 0.48) return "Payment link";

  if (roll < 0.74) return "Cash";

  if (roll < 0.85) return "Bank transfer";

  return "Own card reader";
};

export const addFullPayment = ({ now, log }: LedgerContext, visit: Visit) => {
  const { service, end, booked, rolls, base } = visit;

  log.add({
    description: "Full payment",
    method: "Card online",
    at: booked,
    amount: service.price,
    ...base,
  });

  if (end <= now && rolls[3] < 0.3)
    log.add({
      description: "Tip",
      method: "Saved card",
      at: new Date(end.getTime() + 120000),
      amount: [5, 10, 5, 8][Math.floor(rolls[4] * 4)]!,
      ...base,
    });
};

export const addCancellation = ({ now, log }: LedgerContext, visit: Visit) => {
  const { service, at, booked, rolls, deposit, base } = visit;

  const depositTransaction = log.add({
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

      log.add({
        description: "Refund",
        method: "Card online",
        at: refundAt,
        amount: -deposit,
        note: "Cancelled by the client more than 48 hours before. Deposit refunded in full.",
        ...base,
      });
    }
  } else if (at <= now)
    log.add({
      description: "Cancellation fee",
      method: "Saved card",
      at: new Date(at.getTime() - 20 * 3600000),
      amount: roundToPence(service.price * 0.3),
      note: "Cancelled 20 hours before, inside your 48-hour window. Deposit kept and the rest of the 50% fee charged to the saved card.",
      ...base,
    });
};

export const addNoShow = ({ log }: LedgerContext, visit: Visit) => {
  const { service, at, booked, deposit, base } = visit;

  log.add({
    description: "Deposit",
    method: "Card online",
    at: booked,
    amount: deposit,
    ...base,
  });

  log.add({
    description: "No-show fee",
    method: "Saved card",
    at: new Date(at.getTime() + 15 * 60000 + 3600000),
    amount: roundToPence(service.price * 0.3),
    note: "Client didn’t arrive within the 15 minute grace period.",
    ...base,
  });
};

export const addVisit = (
  { now, log }: LedgerContext,
  visit: Visit,
  options: AppointmentOptions,
) => {
  const { service, end, booked, rolls, deposit, base } = visit;

  log.add({
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

  log.add({
    description: "Balance",
    method,
    isRecorded,
    at: new Date(end.getTime() + 60000),
    amount: roundToPence(service.price - deposit),
    ...base,
  });

  if (rolls[2] < 0.3)
    log.add({
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
      log.add({
        description: "Refund",
        method,
        at: refundAt,
        amount: -roundToPence((service.price - deposit) * 0.5),
        note: "Partial refund. Client asked for a touch-up that couldn’t be booked in time.",
        ...base,
      });
  }
};
