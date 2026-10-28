import { afterEach, describe, expect, it, vi } from "vitest";
import type { StudioActions, StudioContext } from "../../../core/actions";
import { GATE_REASON } from "../../../core/constants";
import { getInitialStudioState } from "../../../core/initial-state";
import type { StudioService, StudioState } from "../../../core/types";
import { createMenuActions } from "../menus";
import type { WizardActions } from "../wizard";

const service = {
  id: "service 1",
  name: "Knotless braids",
  duration: "4h",
  price: 120,
  status: "active",
} as StudioService;

const liveState = {
  ...getInitialStudioState(),
  account: { ...getInitialStudioState().account, slug: "crowned-by-kemi" },
  check: { availability: true, profile: true, stripe: true },
  twoFactorSettings: { devices: [{ id: "device-1" }] },
  tax: { id: "tax-1" },
} as unknown as StudioState;

const runQuickLink = (state: StudioState, picked: StudioService = service) => {
  const showToast = vi.fn();
  const openActionSheet = vi.fn();

  const { openServiceActions } = createMenuActions(
    { getState: () => state, setState: vi.fn() } as unknown as StudioContext,
    { openActionSheet, showToast } as unknown as StudioActions,
    { openWizard: vi.fn() } as unknown as WizardActions,
  );

  openServiceActions(picked);

  const [[{ items }]] = openActionSheet.mock.calls as [
    [{ items: { label: string; run: () => void }[] }],
  ];

  items.find(({ label }) => label === "Quick booking link")?.run();

  return showToast;
};

const mockClipboard = (writeText: (text: string) => Promise<void>) => {
  const spy = vi.fn(writeText);

  vi.stubGlobal("navigator", { clipboard: { writeText: spy } });

  return spy;
};

describe("services → quick booking link", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("copies the stylist's booking link with the service picked, then confirms", async () => {
    const writeText = mockClipboard(async () => undefined);
    const showToast = runQuickLink(liveState);

    expect(writeText).toHaveBeenCalledWith(
      "tiwarashouse.com/book?stylist=crowned-by-kemi&service=service%201",
    );

    expect(showToast).not.toHaveBeenCalled();

    await vi.waitFor(() =>
      expect(showToast).toHaveBeenCalledWith(
        "Booking link for Knotless braids copied",
      ),
    );
  });

  it("says so when the clipboard write fails", async () => {
    mockClipboard(async () => {
      throw new Error("denied");
    });

    const showToast = runQuickLink(liveState);

    await vi.waitFor(() =>
      expect(showToast).toHaveBeenCalledWith(
        "The booking link couldn’t be copied. Try again.",
      ),
    );
  });

  it("doesn't copy a link for a service clients can't book", () => {
    const writeText = mockClipboard(async () => undefined);
    const showToast = runQuickLink(liveState, { ...service, status: "draft" });

    expect(writeText).not.toHaveBeenCalled();

    expect(showToast).toHaveBeenCalledWith(
      "Make Knotless braids active to share its booking link.",
    );
  });

  it("doesn't copy a link before the studio is live", () => {
    const writeText = mockClipboard(async () => undefined);
    const showToast = runQuickLink(getInitialStudioState());

    expect(writeText).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith(GATE_REASON);
  });
});
