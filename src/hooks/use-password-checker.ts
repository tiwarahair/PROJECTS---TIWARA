import { useEffect, useReducer } from "react";
import { onPasswordCheckerReady } from "../utils/password";

/**
 * Loads zxcvbn and re-renders once it is ready (prototype PW.onReady in componentDidMount). The listener also
 * runs when the checker loaded before this mounted, so the meter never keeps the length-only result.
 */
export const usePasswordChecker = (): void => {
  const [, rerender] = useReducer((count: number) => count + 1, 0);

  useEffect(() => onPasswordCheckerReady(rerender), []);
};
