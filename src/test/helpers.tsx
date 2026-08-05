import type { ReactElement } from "react";
import { act, render } from "@testing-library/react";
import { Provider } from "react-redux";
import {
  MemoryRouter,
  useNavigate,
  type InitialEntry,
  type NavigateFunction,
} from "react-router";
import { vi } from "vitest";
import { createStore } from "../stores/store";
import { BackdropProvider } from "../hooks/use-backdrop-location";

/**
 * Renders inside a fresh store, the backdrop provider and a router seeded at
 * `route`. Returns a `navigate` so tests can move between routes for real —
 * which the backdrop needs, since it is derived from where you have been
 * rather than from anything a single initial entry can express.
 */
export function renderWithRouter(
  ui: ReactElement,
  route: string | InitialEntry = "/",
) {
  let navigate: NavigateFunction | undefined;
  function CaptureNavigate() {
    navigate = useNavigate();
    return null;
  }

  const result = render(
    <Provider store={createStore()}>
      <MemoryRouter initialEntries={[route]}>
        <BackdropProvider>
          <CaptureNavigate />
          {ui}
        </BackdropProvider>
      </MemoryRouter>
    </Provider>,
  );

  return {
    ...result,
    navigate: (to: string) => act(() => void navigate?.(to)),
  };
}

export interface FakeIntersectionObserver {
  /** Drives every live observer as though the element entered the viewport. */
  enter: () => void;
  /** Drives every live observer as though the element left the viewport. */
  leave: () => void;
  unobserveCount: () => number;
  restore: () => void;
}

/**
 * jsdom has no IntersectionObserver. This installs a controllable stand-in so
 * tests can drive intersection explicitly instead of waiting on layout.
 */
export function installFakeIntersectionObserver(): FakeIntersectionObserver {
  const callbacks = new Set<IntersectionObserverCallback>();
  let unobserved = 0;
  const original = globalThis.IntersectionObserver;

  class FakeObserver implements IntersectionObserver {
    readonly root = null;
    readonly rootMargin = "";
    readonly thresholds: readonly number[] = [];

    constructor(private readonly callback: IntersectionObserverCallback) {
      callbacks.add(callback);
    }
    observe() {}
    unobserve() {
      unobserved += 1;
    }
    disconnect() {
      callbacks.delete(this.callback);
    }
    takeRecords(): IntersectionObserverEntry[] {
      return [];
    }
  }

  globalThis.IntersectionObserver =
    FakeObserver as unknown as typeof IntersectionObserver;

  function fire(isIntersecting: boolean) {
    for (const callback of [...callbacks]) {
      const entry = { isIntersecting } as IntersectionObserverEntry;
      callback([entry], {} as IntersectionObserver);
    }
  }

  return {
    enter: () => fire(true),
    leave: () => fire(false),
    unobserveCount: () => unobserved,
    restore: () => {
      globalThis.IntersectionObserver = original;
      vi.restoreAllMocks();
    },
  };
}
