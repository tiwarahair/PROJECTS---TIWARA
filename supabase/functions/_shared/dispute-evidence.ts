import { admin } from "./admin.ts";
import { stripe } from "./stripe.ts";
import { pounds } from "./money.ts";

export interface DisputeFacts {
  stripe_dispute_id: string;
  status: string;
  outcome: string | null;
  evidence: {
    text?: string;
    photos?: string;
    messages?: string;
    other?: string;
  };
  client_name: string;
  client_email: string | null;
  service_name: string | null;
  starts_at: string | null;
  arrived_at: string | null;
  completed_at: string | null;
  terms: Record<string, unknown> | null;
  lines:
    | {
        name: string;
        base_pence: number;
        adjustment_pence: number;
        reason: string;
      }[]
    | null;
  final_pence: number;
  business_name: string;
}

const londonTime = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/London",
  dateStyle: "full",
  timeStyle: "short",
});

const londonDate = (iso: string) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(new Date(iso));

const getPolicy = (terms: Record<string, unknown> | null) => {
  if (!terms) return "";

  const parts = [];

  if (terms.mode === "deposit")
    parts.push(`${terms.deposit_percent}% deposit (${terms.refundable ? "refundable" : "non-refundable"})`);

  if (terms.mode === "full") parts.push("full payment when booking");

  if (terms.free_window_hours) parts.push(`free cancellation up to ${terms.free_window_hours} hours before`);

  if (terms.late_on) parts.push(`a late cancellation fee of ${terms.late_percent ?? ""}%`);

  if (terms.no_show_on) parts.push(`a no-show fee of ${terms.no_show_percent ?? ""}%`);

  return parts.length ? `Agreed when booking: ${parts.join(", ")}.` : "";
};

const getAppointment = (facts: DisputeFacts) =>
  [
    facts.starts_at
      ? `Appointment: ${facts.service_name} on ${londonTime.format(new Date(facts.starts_at))} (UK time).`
      : "",
    facts.arrived_at ? `The client arrived at ${londonTime.format(new Date(facts.arrived_at))}.` : "",
    facts.completed_at ? `The appointment was completed and checked out.` : "",
    facts.lines?.length
      ? `Charged: ${facts.lines
          .map(
            ({ name, base_pence: base, adjustment_pence: adjustment, reason }) =>
              `${name} ${pounds(base + adjustment)}${adjustment ? ` (${reason})` : ""}`,
          )
          .join(", ")}; total ${pounds(facts.final_pence)}.`
      : "",
  ].filter(Boolean);

export const getEvidence = (facts: DisputeFacts) => {
  const { evidence } = facts;
  const policy = getPolicy(facts.terms);

  const text = [evidence.text ? `From ${facts.business_name}: ${evidence.text}` : "", ...getAppointment(facts), policy]
    .filter(Boolean)
    .join("\n\n");

  return {
    customer_name: facts.client_name || undefined,
    customer_email_address: facts.client_email || undefined,
    product_description: facts.service_name ? `${facts.service_name} with ${facts.business_name}` : undefined,
    service_date: facts.starts_at ? londonDate(facts.starts_at) : undefined,
    cancellation_policy_disclosure: policy || undefined,
    uncategorized_text: text || undefined,
    service_documentation: evidence.photos || undefined,
    customer_communication: evidence.messages || undefined,
    uncategorized_file: evidence.other || undefined,
  };
};

export const submitDispute = async (target: string, facts: DisputeFacts, evidence: DisputeFacts["evidence"]) => {
  await stripe.disputes.update(facts.stripe_dispute_id, {
    evidence: getEvidence({ ...facts, evidence }),
    submit: true,
  });

  const { error } = await admin.rpc("save_dispute_response", {
    target,
    response: "submitted",
    given: evidence,
  });

  if (error) throw error;
};

export const getDisputeFacts = async (target: string, owner: string) => {
  const { data, error } = await admin.rpc("get_dispute_evidence", {
    target,
    owner,
  });

  if (error) throw error;

  return data as DisputeFacts | null;
};

export const isAnswerable = ({ status, outcome }: DisputeFacts) =>
  !outcome && (status === "needs_response" || status === "warning_needs_response");
