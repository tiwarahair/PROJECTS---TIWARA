// When a card payment's money becomes available in the stylist's Stripe balance, read from their account's record of it, so Earnings can show Pending or Available. Never throws: without it a payment shows Pending until paid out
import { admin } from "./admin.ts";
import { stripe } from "./stripe.ts";

const getMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));

/** The stylist's record of a payment (`py_…` on their account) → its available-on date, saved by payment intent. */
export const saveDestinationPayment = async (intentId: string, paymentId: string, account: string) => {
  try {
    const payment = await stripe.charges.retrieve(
      paymentId,
      { expand: ["balance_transaction"] },
      { stripeAccount: account },
    );

    const balance = payment.balance_transaction;

    if (!balance || typeof balance === "string") return;

    const { error } = await admin.rpc("save_card_payment", {
      intent: intentId,
      destination: paymentId,
      available: new Date(balance.available_on * 1000).toISOString(),
    });

    if (error) throw error;
  } catch (error) {
    console.error("card payment details not saved", intentId, getMessage(error));
  }
};

/** For a destination charge: follows its transfer to the payment on the stylist's account. */
export const saveCardPayment = async (intentId: string, chargeId: string) => {
  try {
    const charge = await stripe.charges.retrieve(chargeId, {
      expand: ["transfer"],
    });

    const transfer = charge.transfer;

    if (!transfer || typeof transfer === "string" || typeof transfer.destination_payment !== "string") return;

    await saveDestinationPayment(intentId, transfer.destination_payment, String(transfer.destination));
  } catch (error) {
    console.error("card payment details not saved", intentId, getMessage(error));
  }
};
