import { describe, expect, it } from "vitest";
import type { AppealPage } from "../../../lib/review-api";
import { getClosedMessage } from "../logic";

const page = (state: AppealPage["state"]) => ({ state }) as AppealPage;

describe("appeal page messages", () => {
  it("thanks the reviewer once they've appealed", () => {
    expect(getClosedMessage(page("appealed")).title).toBe(
      "We’ve got your appeal",
    );
  });

  it("explains when a decision can't be appealed", () => {
    expect(getClosedMessage(page("closed")).title).toBe(
      "This decision can no longer be appealed",
    );
  });

  it("tells an expired link from a failed load", () => {
    expect(getClosedMessage(undefined, "link_not_valid").title).toBe(
      "This link has expired",
    );

    expect(getClosedMessage(undefined, "unknown")).toMatchObject({
      title: "Something went wrong",
      isReload: true,
    });
  });
});
