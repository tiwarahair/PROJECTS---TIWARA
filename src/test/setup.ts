import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

Object.assign(globalThis, {
  jest: { advanceTimersByTime: (ms: number) => vi.advanceTimersByTime(ms) },
});
