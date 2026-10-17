// Studio's saves go straight to Supabase, so cached reads (profiles, search, Studio itself) hear about them here.
const listeners = new Set<() => void>();

export const onStudioWrite = (listener: () => void) => {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
};

/** A failed save whose message can be shown to the stylist as it is. */
export class SaveError extends Error {}

export const notifyStudioWrite = () =>
  listeners.forEach((listener) => listener());
