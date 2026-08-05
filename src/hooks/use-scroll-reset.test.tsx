import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithRouter } from "../test/helpers";
import { useScrollReset } from "./use-scroll-reset";

function Harness() {
  useScrollReset();
  return null;
}

let scrollTo: ReturnType<typeof vi.fn>;

beforeEach(() => {
  scrollTo = vi.fn();
  // jsdom has no layout, so window.scrollTo is a stub either way.
  window.scrollTo = scrollTo as unknown as typeof window.scrollTo;
});
afterEach(() => vi.restoreAllMocks());

describe("useScrollReset", () => {
  it("sends a newly opened page to the top", () => {
    const { navigate } = renderWithRouter(<Harness />, "/shop");
    scrollTo.mockClear();

    navigate("/about-us");

    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "instant" });
  });

  it("resets between stylist profiles", () => {
    const { navigate } = renderWithRouter(<Harness />, "/tiwaras-house");
    scrollTo.mockClear();

    navigate("/amara-beauty");

    expect(scrollTo).toHaveBeenCalledOnce();
  });

  // The page beneath an overlay stays put: coming back from a booking should
  // land where the user left off, not at the top.
  it("leaves the backdrop page alone while an overlay opens and closes", () => {
    const { navigate } = renderWithRouter(<Harness />, "/shop");
    scrollTo.mockClear();

    navigate("/book/style");
    navigate("/shop");

    expect(scrollTo).not.toHaveBeenCalled();
  });

  it("leaves a hashed link to scroll itself into view", () => {
    const { navigate } = renderWithRouter(<Harness />, "/shop");
    scrollTo.mockClear();

    navigate("/#services");

    expect(scrollTo).not.toHaveBeenCalled();
  });
});
