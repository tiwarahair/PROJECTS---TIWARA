import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

Object.assign(globalThis, {
  jest: { advanceTimersByTime: (ms: number) => vi.advanceTimersByTime(ms) },
});

// Turnstile can't load Cloudflare's script in jsdom: hand out a token on mount and on reset()
vi.mock("@marsidev/react-turnstile", async () => {
  const { useEffect, useImperativeHandle, useRef } = await import("react");

  interface TurnstileStubProps {
    onSuccess?: (token: string) => void;
    ref?: React.Ref<{ reset: () => void }>;
  }

  return {
    Turnstile: ({ onSuccess, ref }: TurnstileStubProps) => {
      const latest = useRef(onSuccess);

      latest.current = onSuccess;

      useImperativeHandle(ref, () => ({
        reset: () => latest.current?.("test-captcha-token"),
      }));

      useEffect(() => latest.current?.("test-captcha-token"), []);

      return null;
    },
  };
});
