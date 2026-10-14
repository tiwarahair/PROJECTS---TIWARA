import { useEffect, useState } from "react";

/** The value once it has stopped changing for `delay` ms. */
export const useDebouncedValue = <T>(value: T, delay = 250): T => {
  const [settled, setSettled] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setSettled(value), delay);

    return () => window.clearTimeout(timer);
  }, [value, delay]);

  return settled;
};
