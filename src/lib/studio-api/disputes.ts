import { SaveError } from "../studio-writes";
import { supabase } from "../supabase";
import { check, invokeStudio } from "./request";

export const EVIDENCE_TYPES = ["application/pdf", "image/jpeg", "image/png"];
export const MAX_EVIDENCE_BYTES = 4_500_000;

export interface DisputeEvidence {
  text: string;
  photos?: string;
  messages?: string;
  other?: string;
}

const REFUSALS = {
  409: () => new SaveError("This dispute has already been answered."),
  413: () => new SaveError("That file is over 4.5 MB. Try a smaller one."),
};

const toBase64 = async (file: File) => {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = "";

  for (const byte of bytes) binary += String.fromCharCode(byte);

  return btoa(binary);
};

export const uploadDisputeFile = async (disputeId: string, file: File) => {
  const data = await invokeStudio<{ fileId: string }>(
    "studio-dispute",
    {
      action: "upload",
      disputeId,
      name: file.name.slice(0, 120),
      type: file.type,
      data: await toBase64(file),
    },
    REFUSALS,
  );

  if (!data) throw new Error("upload failed");

  return data.fileId;
};

export const sendDisputeEvidence = (
  disputeId: string,
  evidence: DisputeEvidence,
) =>
  invokeStudio(
    "studio-dispute",
    { action: "submit", disputeId, ...evidence },
    REFUSALS,
  );

export const acceptDispute = (disputeId: string) =>
  invokeStudio("studio-dispute", { action: "accept", disputeId }, REFUSALS);

export interface CloseChecks {
  owedPence: number;
  hasOpenDispute: boolean;
}

const OPEN_STATUSES = [
  "needs_response",
  "under_review",
  "warning_needs_response",
  "warning_under_review",
];

export const fetchCloseChecks = async (
  stylistId: string,
): Promise<CloseChecks> => {
  const [debts, open] = await Promise.all([
    check(
      supabase
        .from("stylist_debts")
        .select("amount_pence, recovered_pence")
        .eq("stylist_id", stylistId),
    ),
    check(
      supabase
        .from("disputes")
        .select("id")
        .eq("stylist_id", stylistId)
        .in("status", OPEN_STATUSES)
        .limit(1),
    ),
  ]);

  let owedPence = 0;

  for (const { amount_pence: amount, recovered_pence: recovered } of debts ??
    [])
    owedPence += amount - recovered;

  return { owedPence, hasOpenDispute: !!open?.length };
};

export const getPayOwedUrl = async () => {
  const data = await invokeStudio<{ url: string }>(
    "studio-debt",
    {},
    { 409: () => new SaveError("There’s nothing to pay any more.") },
  );

  if (!data?.url) throw new Error("no payment page");

  return data.url;
};
