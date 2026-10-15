// Studio's saves go straight to Supabase, so cached reads (profiles, search, Studio itself) hear about them here.
const listeners = new Set<() => void>();

export const onStudioWrite = (listener: () => void) => {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
};

export const notifyStudioWrite = () =>
  listeners.forEach((listener) => listener());
