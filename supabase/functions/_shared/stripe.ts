// Stripe for Connect (Accounts v2): marketplace "recipient" accounts that receive transfers and pay out.
import Stripe from "npm:stripe@22.6.2";

export const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
  httpClient: Stripe.createFetchHttpClient(),
});

type Account = Stripe.V2.Core.Account;

export const retrieveAccount = (id: string) =>
  stripe.v2.core.accounts.retrieve(id, { include: ["configuration.recipient", "requirements"] });

const getCapabilityStatus = (account: Account, key: "stripe_transfers" | "payouts") =>
  account.configuration?.recipient?.capabilities?.stripe_balance?.[key]?.status;

const getPayoutBank = async (accountId: string) => {
  try {
    const { data } = await stripe.accounts.listExternalAccounts(accountId, { object: "bank_account", limit: 1 });
    const [bank] = data;

    return bank?.object === "bank_account" ? `${bank.bank_name ?? "Bank"} •••• ${bank.last4}` : null;
  } catch {
    return null;
  }
};

/** What Studio and the go-live rule need from a connected account. */
export const getAccountState = async (account: Account) => {
  const entries = account.requirements?.entries ?? [];

  const isOwed = (status: string) =>
    entries.some(
      ({ awaiting_action_from, minimum_deadline }) =>
        awaiting_action_from === "user" && minimum_deadline.status === status,
    );

  return {
    // "charges" here means the account can be paid: transfers from bookings land in its balance
    charges_enabled: getCapabilityStatus(account, "stripe_transfers") === "active",
    payouts_enabled: getCapabilityStatus(account, "payouts") === "active",
    details_submitted: !isOwed("currently_due") && !isOwed("past_due"),
    stripe_requirements: isOwed("past_due") ? "past_due" : isOwed("currently_due") ? "due" : "none",
    payout_bank: await getPayoutBank(account.id),
  };
};
