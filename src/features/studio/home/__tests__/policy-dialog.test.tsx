import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { StudioController } from "../../core/use-studio";
import { PolicyDialog } from "../policy-dialog";
import { setupUser } from "../../../../test/setup-user";

const getStudio = (policyReminder = false) => {
  const setState = vi.fn();
  const openSubpage = vi.fn();
  const save = vi.fn();

  return {
    studio: {
      state: {
        account: { stylistId: "stylist-1" },
        policyReminder,
        policy: { window: 24 },
      },
      setState,
      actions: { openSubpage },
      context: { sync: { save } },
    } as unknown as StudioController,
    setState,
    openSubpage,
    save,
  };
};

describe("the policy dialog", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("opens the payment policy page from its main button", async () => {
    const user = setupUser();
    const { studio, setState, openSubpage } = getStudio();

    render(<PolicyDialog studio={studio} />);

    expect(
      screen.getByRole("dialog", { name: "Make your policy your own" }),
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        "You can take bookings now. Until you set a booking policy, clients book without a deposit or card. Only the booking fee is non-refundable if they cancel within 24 hours of the appointment.",
      ),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Set your policy" }));
    act(() => void vi.runAllTimers());

    expect(setState).toHaveBeenCalledWith({
      nudge: false,
      policyReminder: false,
    });

    expect(openSubpage).toHaveBeenCalledWith("policy");
  });

  it("closes for good with Not now or Escape, without opening anything", async () => {
    const user = setupUser();
    const { studio, setState, openSubpage } = getStudio();

    render(<PolicyDialog studio={studio} />);
    await user.keyboard("{Escape}");
    act(() => void vi.runAllTimers());

    expect(setState).toHaveBeenCalledWith({
      nudge: false,
      policyReminder: false,
    });

    expect(openSubpage).not.toHaveBeenCalled();
  });

  it("saves which nudge was closed, so the 2-day reminder only shows once", async () => {
    const user = setupUser();
    const reminder = getStudio(true);
    const first = getStudio();

    const { unmount } = render(<PolicyDialog studio={reminder.studio} />);

    await user.click(screen.getByRole("button", { name: "Not now" }));
    act(() => void vi.runAllTimers());
    unmount();

    render(<PolicyDialog studio={first.studio} />);
    await user.click(screen.getByRole("button", { name: "Not now" }));
    act(() => void vi.runAllTimers());

    expect(reminder.save).toHaveBeenCalledTimes(1);
    expect(first.save).toHaveBeenCalledTimes(1);
  });
});
