import { vi } from "vitest";

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
