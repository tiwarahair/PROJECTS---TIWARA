import { act, screen, within } from "@testing-library/react";
import type { UserEvent } from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchCalendarSecret } from "../../../lib/client-calendar";
import { renderWithStore } from "../../../test/render-with-store";
import { setupUser } from "../../../test/setup-user";
import { AccountPage } from "..";

vi.mock("../../../lib/client-calendar", () => ({
  fetchCalendarSecret: vi.fn(),
}));

const FIRST = "a".repeat(48);
const RENEWED = "b".repeat(48);

let user: UserEvent;

// query results reach the page on the next animation frame, a faked timer here
const settle = () => act(() => vi.advanceTimersByTimeAsync(100));

describe("Account calendar link", () => {
  beforeEach(() => {
    vi.useFakeTimers({
      toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval"],
    });

    user = setupUser();

    vi.mocked(fetchCalendarSecret).mockImplementation(async (renew) =>
      renew ? RENEWED : FIRST,
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("shows the client's own link and can reset it", async () => {
    renderWithStore(<AccountPage />, "/account?section=communication", {
      signedIn: true,
    });

    await settle();

    expect(screen.getByLabelText(/Your calendar link/)).toHaveValue(
      `webcal://${window.location.host}/cal/${FIRST}.ics`,
    );

    expect(
      screen.getByRole("link", { name: "Apple Calendar" }),
    ).toHaveAttribute(
      "href",
      `webcal://${window.location.host}/cal/${FIRST}.ics`,
    );

    expect(
      screen
        .getByRole("link", { name: "Google Calendar" })
        .getAttribute("href"),
    ).toContain(
      `cid=${encodeURIComponent(`webcal://${window.location.host}/cal/${FIRST}.ics`)}`,
    );

    expect(
      screen.getByRole("link", { name: "Outlook" }).getAttribute("href"),
    ).toContain(
      `url=${encodeURIComponent(`${window.location.origin}/cal/${FIRST}.ics`)}`,
    );

    await user.click(screen.getByRole("button", { name: "Reset link" }));

    await user.click(
      within(
        screen.getByRole("dialog", { name: "Reset your calendar link?" }),
      ).getByRole("button", { name: "Reset link" }),
    );

    await settle();

    expect(fetchCalendarSecret).toHaveBeenLastCalledWith(true);

    expect(screen.getByLabelText(/Your calendar link/)).toHaveValue(
      `webcal://${window.location.host}/cal/${RENEWED}.ics`,
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      "New calendar link created",
    );
  });

  it("says when the link couldn't load and can try again", async () => {
    vi.mocked(fetchCalendarSecret)
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(FIRST);

    renderWithStore(<AccountPage />, "/account?section=communication", {
      signedIn: true,
    });

    await settle();

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Your calendar link couldn’t load.",
    );

    await user.click(screen.getByRole("button", { name: "Try again" }));
    await settle();

    expect(screen.getByLabelText(/Your calendar link/)).toHaveValue(
      `webcal://${window.location.host}/cal/${FIRST}.ics`,
    );

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
