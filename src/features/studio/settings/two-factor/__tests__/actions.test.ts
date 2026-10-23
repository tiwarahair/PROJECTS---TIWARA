import { FunctionsHttpError } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TaxDetails } from "../../../../../components/tax-details-form/logic";
import { saveTaxDetails } from "../../../../../lib/studio-api/settings";
import {
  listTwoFactorDevices,
  startTwoFactorEnrolment,
  verifySecondFactor,
} from "../../../../../lib/two-factor";
import type {
  TwoFactorDevice,
  TwoFactorEnrolment,
} from "../../../../../lib/two-factor";
import type { StudioContext } from "../../../core/actions";
import { createTaxActions } from "../../payouts/tax-actions";
import { createTwoFactorActions } from "../actions";
import type { StudioPatch, StudioState } from "../../../core/types";

vi.mock("../../../../../lib/studio-api/settings", () => ({
  saveTaxDetails: vi.fn(),
}));

vi.mock("../../../../../lib/two-factor", () => ({
  confirmTwoFactorEnrolment: vi.fn(() => Promise.resolve(true)),
  listTwoFactorDevices: vi.fn(),
  startTwoFactorEnrolment: vi.fn(),
  verifySecondFactor: vi.fn(() => Promise.resolve(true)),
}));

const lapsed = () =>
  new FunctionsHttpError(new Response(null, { status: 403 }));

const setup = () => {
  let state = {
    account: { stylistId: "stylist" },
    twoFactor: null,
    twoFactorSettings: { devices: [] },
  } as unknown as StudioState;

  const context = {
    getState: () => state,
    setState: (patch: StudioPatch) => {
      state = {
        ...state,
        ...(typeof patch === "function" ? patch(state) : patch),
      } as StudioState;
    },
    timers: {},
    memo: {},
  } as unknown as StudioContext;

  const showToast = vi.fn();

  const checkDone = vi.fn();
  const twoFactor = createTwoFactorActions(context, { showToast, checkDone });

  const actions = {
    ...twoFactor,
    ...createTaxActions(context, { showToast, checkDone, twoFactor }),
  };

  return { actions, showToast, getState: () => state };
};

describe("two-step verification actions", () => {
  beforeEach(() => vi.clearAllMocks());

  it("a tax save that needs a fresh code saves the same details after it", async () => {
    vi.mocked(saveTaxDetails)
      .mockRejectedValueOnce(lapsed())
      .mockResolvedValueOnce("QQ •• •• 56 C");

    const { actions, getState } = setup();
    const onSaved = vi.fn();
    const value = { kind: "sole" } as TaxDetails;

    await actions.saveTax(value, onSaved);
    expect(getState().twoFactor?.step).toBe("taxcode");
    expect(onSaved).not.toHaveBeenCalled();

    actions.setTwoFactor({ code: "123456" });
    await actions.confirmTaxCode();
    await vi.waitFor(() => expect(onSaved).toHaveBeenCalled());

    expect(saveTaxDetails).toHaveBeenLastCalledWith(value);
    expect(getState().tax?.nationalInsuranceHint).toBe("QQ •• •• 56 C");
  });

  it("the code step is busy while the code is checked", async () => {
    let finishCheck: (isRight: boolean) => void = () => undefined;

    vi.mocked(verifySecondFactor).mockReturnValueOnce(
      new Promise((resolve) => {
        finishCheck = resolve;
      }),
    );

    const { actions, getState } = setup();

    actions.openTwoFactor("taxcode", { flow: "info" });
    actions.setTwoFactor({ code: "123456" });

    const checking = actions.confirmTaxCode();

    expect(getState().twoFactor?.isBusy).toBe(true);

    finishCheck(true);
    await checking;
    expect(getState().twoFactor?.isBusy).toBe(false);
  });

  it("a new app's button stays busy until the app list has reloaded", async () => {
    let finishList: (devices: TwoFactorDevice[]) => void = () => undefined;

    vi.mocked(startTwoFactorEnrolment).mockResolvedValueOnce({
      factorId: "new",
      qrCode: "",
      secret: "",
      uri: "",
    });

    vi.mocked(listTwoFactorDevices).mockReturnValueOnce(
      new Promise((resolve) => {
        finishList = resolve;
      }),
    );

    const { actions, getState } = setup();

    actions.openTwoFactor("method");
    actions.beginEnrolment({ kind: "main", name: "Main phone" });

    await vi.waitFor(() =>
      expect(getState().twoFactor?.enrolment).toBeTruthy(),
    );

    actions.setTwoFactor({ code: "123456" });
    actions.verifyTwoFactor();
    await vi.waitFor(() => expect(listTwoFactorDevices).toHaveBeenCalled());
    expect(getState().twoFactor?.isBusy).toBe(true);

    finishList([{ id: "new", name: "Main phone", backup: false }]);
    await vi.waitFor(() => expect(getState().twoFactor?.isVerified).toBe(true));
    expect(getState().twoFactor?.isBusy).toBe(false);
  });

  it("closing the code step forgets what it was going to do", async () => {
    vi.mocked(saveTaxDetails).mockRejectedValueOnce(lapsed());

    const { actions, getState } = setup();

    await actions.saveTax({ kind: "sole" } as TaxDetails, vi.fn());
    actions.closeTwoFactor();
    actions.openTwoFactor("taxcode", { flow: "info" });
    actions.setTwoFactor({ code: "123456" });
    await actions.confirmTaxCode();

    expect(saveTaxDetails).toHaveBeenCalledTimes(1);
    expect(getState().taxEdit).toBe(true);
  });

  it("only the latest QR request fills the dialog, and a failed one offers a retry", async () => {
    let finishFirst: (value: TwoFactorEnrolment) => void = () => undefined;

    vi.mocked(startTwoFactorEnrolment)
      .mockReturnValueOnce(
        new Promise((resolve) => {
          finishFirst = resolve;
        }),
      )
      .mockRejectedValueOnce(new Error("offline"));

    const { actions, getState } = setup();

    actions.openTwoFactor("method");
    actions.beginEnrolment({});
    actions.beginEnrolment({});

    await vi.waitFor(() =>
      expect(getState().twoFactor?.isEnrolmentFailed).toBe(true),
    );

    finishFirst({ factorId: "old", qrCode: "", secret: "", uri: "" });
    await Promise.resolve();
    expect(getState().twoFactor?.enrolment).toBeNull();
  });
});
