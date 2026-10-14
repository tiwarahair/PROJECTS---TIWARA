// The two-step verification dialog: open, step through, add an app, remove one.
import {
  confirmTwoFactorEnrolment,
  hasRecentSecondFactor,
  listTwoFactorDevices,
  removeTwoFactorApp,
  startTwoFactorEnrolment,
  verifySecondFactor,
} from "../../lib/two-factor";
import { FunctionsHttpError } from "@supabase/supabase-js";
import type { TaxDetails } from "../../components/tax-details-form/tax-details-logic";
import { saveTaxDetails } from "../../lib/studio-api";
import type { StudioContext } from "./studio-actions";
import type { TwoFactorFlow } from "./studio-types";

const DEMO_CODE = "123456";

const WRONG_CODE =
  "That code isn’t right. Enter the latest code from your app.";

const FAILED = "That didn’t work. Check your connection and try again.";

export const createTwoFactorActions = (
  { getState, setState, timers, memo }: StudioContext,
  {
    showToast,
    checkDone,
  }: { showToast: (text: string) => void; checkDone: () => void },
) => {
  const openTwoFactor = (step: string, extra: Partial<TwoFactorFlow> = {}) => {
    window.clearTimeout(timers.twoFactor);

    setState({
      twoFactor: {
        step,
        kind: "main",
        name: "Main phone",
        code: "",
        error: "",
        errorMessage: "",
        keyShown: false,
        option: "device",
        skipWarn: false,
        flow: "setup",
        ...extra,
      },
      twoFactorOut: false,
    });
  };

  const closeTwoFactor = () => {
    if (!getState().twoFactor) return;

    memo.afterSecondFactor = undefined;

    setState({ twoFactorOut: true });
    window.clearTimeout(timers.twoFactor);

    timers.twoFactor = window.setTimeout(
      () => setState({ twoFactor: null, twoFactorOut: false }),
      160,
    );
  };

  const setTwoFactor = (patch: Partial<TwoFactorFlow>) =>
    setState(({ twoFactor }) => ({
      twoFactor: twoFactor ? { ...twoFactor, ...patch } : twoFactor,
    }));

  const isReal = () => !!getState().account;

  /** Checks the dialog's code (Supabase for a real account, 123456 on demo boards), then carries on. */
  const withCode = async (
    check: (code: string) => Promise<boolean>,
    onPass: () => void | Promise<void>,
  ) => {
    const { twoFactor } = getState();

    if (!twoFactor || twoFactor.isBusy) return;

    const code = twoFactor.code || "";

    if (code.length < 6)
      return setTwoFactor({
        error: "code",
        errorMessage: "Enter the 6-digit code",
      });

    setTwoFactor({ isBusy: true });

    try {
      const isRight = isReal() ? await check(code) : code === DEMO_CODE;

      setTwoFactor({ isBusy: false });

      if (!isRight)
        return setTwoFactor({ error: "code", errorMessage: WRONG_CODE });

      await onPass();
    } catch {
      setTwoFactor({ isBusy: false, error: "code", errorMessage: FAILED });
    }
  };

  /** The app step: a real account gets its QR code and key from Supabase. */
  const beginEnrolment = (patch: Partial<TwoFactorFlow>) => {
    setTwoFactor({
      ...patch,
      step: "app",
      enrolment: null,
      isEnrolmentFailed: false,
    });

    if (!isReal()) return;

    const request = (memo.enrolmentRequest ?? 0) + 1;

    memo.enrolmentRequest = request;

    startTwoFactorEnrolment()
      .then((enrolment) => {
        if (memo.enrolmentRequest === request) setTwoFactor({ enrolment });
      })
      .catch(() => {
        if (memo.enrolmentRequest === request)
          setTwoFactor({ isEnrolmentFailed: true });
      });
  };

  const retryEnrolment = () => beginEnrolment({});

  const verifyTwoFactor = () => {
    const { twoFactor, twoFactorSettings } = getState();

    if (!twoFactor) return;

    const devices = twoFactorSettings.devices;
    const name = (twoFactor.name || "").trim();

    if (!name)
      return setTwoFactor({ error: "name", errorMessage: "Name this device" });

    if (
      devices.some((device) => device.name.toLowerCase() === name.toLowerCase())
    )
      return setTwoFactor({
        error: "name",
        errorMessage: "You already have a device with this name",
      });

    const { enrolment } = twoFactor;

    if (isReal() && !enrolment)
      return setTwoFactor({
        error: "code",
        errorMessage: "The QR code is still loading. Try again in a moment.",
      });

    const added = devices.concat([
      { name, backup: twoFactor.kind === "backup" },
    ]);

    void withCode(
      (code) =>
        confirmTwoFactorEnrolment(enrolment?.factorId ?? "", code, name),
      async () => {
        setState({
          twoFactorSettings: {
            devices: isReal()
              ? await listTwoFactorDevices().catch(() => added)
              : added,
          },
        });

        if (twoFactor.kind === "main")
          setTwoFactor({
            step: "backup",
            code: "",
            error: "",
            errorMessage: "",
            option: "device",
            skipWarn: false,
            keyShown: false,
            enrolment: null,
          });
        else if (twoFactor.flow === "add") {
          closeTwoFactor();
          showToast("Backup added");
        } else
          setTwoFactor({ step: "done", code: "", error: "", errorMessage: "" });

        checkDone();
      },
    );
  };

  const removeTwoFactorDevice = () => {
    const { twoFactor, twoFactorSettings } = getState();

    if (!twoFactor) return;

    const devices = twoFactorSettings.devices;

    if (devices.length <= 1) return closeTwoFactor();

    const device = devices.find(({ name }) => name === twoFactor.name);

    void withCode(
      (code) => removeTwoFactorApp(device?.id ?? "", code),
      async () => {
        const kept = devices.filter((item) => item !== device);

        let next = isReal()
          ? await listTwoFactorDevices().catch(() => kept)
          : kept;

        if (!next.some(({ backup }) => !backup))
          next = next.map((item, index) =>
            index === 0 ? { ...item, backup: false } : item,
          );

        setState({ twoFactorSettings: { devices: next } });
        closeTwoFactor();
        showToast(`${twoFactor.name} removed`);
      },
    );
  };

  /** Tax details need an app code from the last 30 days; within that, no code is asked for. */
  const openTaxEdit = async () => {
    memo.afterSecondFactor = undefined;

    if (isReal() && (await hasRecentSecondFactor().catch(() => false)))
      return setState({ taxEdit: true });

    openTwoFactor("taxcode", { flow: "info" });
  };

  /** Saves tax details (encrypted on the server for a real account). */
  const saveTax = async (value: TaxDetails, onSaved?: () => void) => {
    try {
      const tax = isReal()
        ? {
            ...value,
            nationalInsuranceNumber: "",
            nationalInsuranceHint: await saveTaxDetails(value),
          }
        : value;

      setState({ tax });
      showToast("Tax details saved");
      checkDone();
      onSaved?.();
    } catch (error) {
      const isLapsed =
        error instanceof FunctionsHttpError && error.context.status === 403;

      if (!isLapsed)
        return showToast("Your tax details couldn’t be saved. Try again.");

      showToast("For your security, enter a code from your authenticator app.");
      openTwoFactor("taxcode", { flow: "info" });
      memo.afterSecondFactor = () => void saveTax(value, onSaved);
    }
  };

  const confirmTaxCode = () =>
    withCode(
      (code) => verifySecondFactor(code),
      () => {
        const next = memo.afterSecondFactor;

        closeTwoFactor();

        if (next) next();
        else setState({ taxEdit: true });
      },
    );

  return {
    openTwoFactor,
    closeTwoFactor,
    setTwoFactor,
    beginEnrolment,
    retryEnrolment,
    verifyTwoFactor,
    removeTwoFactorDevice,
    openTaxEdit,
    confirmTaxCode,
    saveTax,
  };
};
