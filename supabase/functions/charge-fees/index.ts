// Run by cron every minute while fees are due: settles each one whose waive window has closed.
import { admin } from "../_shared/admin.ts";
import { settleFee } from "../_shared/fee-settlement.ts";
import type { FeeSettlement } from "../_shared/fee-settlement.ts";

const BATCH_SIZE = 10;

Deno.serve(async (request) => {
  const secret = Deno.env.get("CRON_SECRET");

  if (!secret || request.headers.get("x-cron-secret") !== secret) return new Response("Forbidden", { status: 403 });

  const { data, error } = await admin.rpc("claim_due_fees", { batch_size: BATCH_SIZE });

  if (error) return new Response(error.message, { status: 500 });

  const fees = (data ?? []) as FeeSettlement[];
  let failed = 0;

  for (const fee of fees) {
    try {
      await settleFee(fee);
    } catch (settleError) {
      // left claimed; the next run after 15 minutes tries it again
      failed++;
      console.error("charge-fees failed", fee.id, settleError instanceof Error ? settleError.message : settleError);
    }
  }

  return Response.json({ claimed: fees.length, failed });
});
