// Studio's requests: a read's data or its error, a write that tells cached reads, and an Edge Function call.
import { FunctionsHttpError } from "@supabase/supabase-js";
import { notifyStudioWrite } from "../studio-writes";
import { supabase } from "../supabase";

/** The request's data (empty for functions that return nothing), or its error thrown. */
export const check = async <T>(
  request: PromiseLike<{ data: T; error: Error | null }>,
) => {
  const { data, error } = await request;

  if (error) throw error;

  return data;
};

/** check() for a write: tells cached reads the data changed. */
export const write = async <T>(
  request: PromiseLike<{ data: T; error: Error | null }>,
) => {
  const data = await check(request);

  notifyStudioWrite();

  return data;
};

/** Calls a Studio Edge Function; the refusals listed by status become those errors, and a success is a write. */
export const invokeStudio = async <T>(
  name: string,
  body: object,
  refusals: Record<number, () => Error> = {},
) => {
  const { data, error } = await supabase.functions.invoke<T>(name, { body });

  const refusal =
    error instanceof FunctionsHttpError
      ? refusals[error.context.status]
      : undefined;

  if (refusal) throw refusal();

  if (error) throw error;

  notifyStudioWrite();

  return data;
};
