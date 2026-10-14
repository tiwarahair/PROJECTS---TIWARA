import { FunctionsHttpError } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TaxDetails } from "../../../components/tax-details-form/tax-details-logic";
import { saveTaxDetails } from "../../../lib/studio-api";
import {
  startTwoFactorEnrolment,
  verifySecondFactor,
} from "../../../lib/two-factor";
import type { TwoFactorEnrolment } from "../../../lib/two-factor";
import type { StudioContext } from "../studio-actions";
import { createTaxActions } from "../studio-tax-actions";
import { createTwoFactorActions } from "../studio-two-factor-actions";
import type { StudioPatch, StudioState } from "../studio-types";

vi.mock("../../../lib/studio-api", () => ({ saveTaxDetails: vi.fn() }));

vi.mock("../../../lib/two-factor", () => ({
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
