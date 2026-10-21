import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "./supabase";

/** An Edge Function's error code, e.g. "slot_taken" (else "unknown"). */
export class FunctionError extends Error {}

export const invokeFunction = async <T>(name: string, body: object) => {
  const { data, error } = await supabase.functions.invoke<T>(name, { body });

  if (error instanceof FunctionsHttpError) {
    const response = (await error.context.json().catch(() => ({}))) as {
      error?: string;
    };

    throw new FunctionError(response.error ?? "unknown");
  }

  if (error || !data) throw new FunctionError("unknown");

  return data;
};
