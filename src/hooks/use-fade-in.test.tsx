import { act, render, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useFadeIn } from "./use-fade-in";
import {
  installFakeIntersectionObserver,
  type FakeIntersectionObserver,
} from "../test/helpers";

let observer: FakeIntersectionObserver;

function FadingBox() {
  const [ref, visible] = useFadeIn<HTMLDivElement>();
  return (
    <div ref={ref} data-testid="box" className={visible ? "visible" : ""} />
  );
}

afterEach(() => observer?.restore());

describe("useFadeIn", () => {
  it("starts hidden", () => {
    observer = installFakeIntersectionObserver();
    const { result } = renderHook(() => useFadeIn<HTMLDivElement>());
    expect(result.current[1]).toBe(false);
  });

  it("reveals once the element intersects", () => {
    observer = installFakeIntersectionObserver();
    const { getByTestId } = render(<FadingBox />);

    act(() => observer.enter());
    expect(getByTestId("box")).toHaveClass("visible");
  });

  it("latches — scrolling past does not fade the element back out", () => {
    observer = installFakeIntersectionObserver();
    const { getByTestId } = render(<FadingBox />);

    act(() => observer.enter());
    act(() => observer.leave());

    // The original called io.unobserve on first intersection, so the reveal
    // was permanent. Tracking isIntersecting directly would reverse it here.
    expect(getByTestId("box")).toHaveClass("visible");
  });

  it("stops observing after the first reveal", () => {
    observer = installFakeIntersectionObserver();
    render(<FadingBox />);

    act(() => observer.enter());
    expect(observer.unobserveCount()).toBeGreaterThan(0);
  });
});
