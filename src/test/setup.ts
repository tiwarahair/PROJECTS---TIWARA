import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

Object.assign(globalThis, {
  jest: { advanceTimersByTime: (ms: number) => vi.advanceTimersByTime(ms) },
});

/** Set isHeld before rendering to keep the first token back until release() (a slow check). */
export const turnstileStub: {
  isHeld: boolean;
  release?: () => void;
  fail?: () => void;
} = {
  isHeld: false,
};

// Turnstile can't load Cloudflare's script in jsdom: hand out a token on mount and on reset()
vi.mock("@marsidev/react-turnstile", async () => {
  const { useEffect, useImperativeHandle, useRef } = await import("react");

  interface TurnstileStubProps {
    onSuccess?: (token: string) => void;
    onError?: () => void;
    ref?: React.Ref<{ reset: () => void }>;
  }

  return {
    Turnstile: ({ onSuccess, onError, ref }: TurnstileStubProps) => {
      const latest = useRef(onSuccess);
      const latestError = useRef(onError);

      latest.current = onSuccess;
      latestError.current = onError;

      useImperativeHandle(ref, () => ({
        reset: () => latest.current?.("test-captcha-token"),
      }));

      useEffect(() => {
        const pass = () => latest.current?.("test-captcha-token");

        turnstileStub.fail = () => latestError.current?.();

        if (turnstileStub.isHeld) turnstileStub.release = pass;
        else pass();
      }, []);

      return null;
    },
  };
});

// No Google Maps in jsdom: providers render their children, maps render nothing, no libraries load
vi.mock("@vis.gl/react-google-maps", () => ({
  APIProvider: ({ children }: { children: React.ReactNode }) => children,
  Map: () => null,
  AdvancedMarker: () => null,
  ColorScheme: { DARK: "DARK", LIGHT: "LIGHT" },
  useMap: () => null,
  useMapsLibrary: vi.fn(() => null),
  // tests without a fake library behave as if Google couldn't load
  useApiLoadingStatus: vi.fn(() => "FAILED"),
  APILoadingStatus: {
    NOT_LOADED: "NOT_LOADED",
    LOADING: "LOADING",
    LOADED: "LOADED",
    FAILED: "FAILED",
    AUTH_FAILURE: "AUTH_FAILURE",
  },
}));

export const stripeStub: {
  confirmPayment: ReturnType<typeof vi.fn>;
  confirmSetup: ReturnType<typeof vi.fn>;
  submit: ReturnType<typeof vi.fn>;
  elementsOptions: Record<string, unknown> | undefined;
} = {
  confirmPayment: vi.fn(() => Promise.resolve({})),
  confirmSetup: vi.fn(() =>
    Promise.resolve({ setupIntent: { payment_method: "pm_new" } }),
  ),
  submit: vi.fn(() => Promise.resolve({})),
  elementsOptions: undefined,
};

vi.mock("@stripe/stripe-js", () => ({
  loadStripe: () => Promise.resolve(null),
}));

vi.mock("@stripe/react-stripe-js", async () => {
  const { createElement } = await import("react");

  return {
    Elements: ({
      children,
      options,
    }: {
      children: React.ReactNode;
      options?: Record<string, unknown>;
    }) => {
      stripeStub.elementsOptions = options;

      return children;
    },
    // clicking it stands in for Stripe finishing loading its fields
    PaymentElement: ({ onReady }: { onReady?: () => void }) =>
      createElement("button", {
        "data-testid": "payment-element",
        onClick: onReady,
      }),
    ExpressCheckoutElement: () => null,
    useStripe: () => ({
      confirmPayment: stripeStub.confirmPayment,
      confirmSetup: stripeStub.confirmSetup,
    }),
    useElements: () => ({ submit: stripeStub.submit }),
  };
});
