import { useEffect, useState } from "react";

/** True once isWaiting has lasted `delay` ms, so quick (or cached) loads never flash a placeholder. */
export const useIsSlow = (isWaiting: boolean, delay = 300) => {
  const [isSlow, setIsSlow] = useState(false);

  useEffect(() => {
    if (!isWaiting) return;

    const timer = window.setTimeout(() => setIsSlow(true), delay);

    return () => {
      window.clearTimeout(timer);
      setIsSlow(false);
    };
  }, [isWaiting, delay]);

  return isWaiting && isSlow;
};
