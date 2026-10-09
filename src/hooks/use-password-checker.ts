import { useEffect, useReducer } from "react";
import {
  isPasswordCheckerReady,
  onPasswordCheckerReady,
} from "../utils/password";

/**
 * Loads zxcvbn and re-renders once it is ready (prototype PW.onReady in componentDidMount). React runs effects
 * after paint, so the checker can finish loading first; re-render then too, or the meter keeps the length-only result.
 */
export const usePasswordChecker = (): void => {
  const [, rerender] = useReducer((count: number) => count + 1, 0);
  useEffect(() => {
    const unsubscribe = onPasswordCheckerReady(rerender);
    if (isPasswordCheckerReady()) rerender();
    return unsubscribe;
  }, []);
};
