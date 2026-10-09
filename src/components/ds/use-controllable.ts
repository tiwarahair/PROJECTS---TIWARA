import { useState } from "react";

/** Controlled when `value` is defined, otherwise internal state seeded from `defaultValue` (DS convention). */
export const useControllable = <T>(value: T | undefined, defaultValue: T) => {
  const [internal, setInternal] = useState(defaultValue);
  return [value !== undefined ? value : internal, setInternal] as const;
};
