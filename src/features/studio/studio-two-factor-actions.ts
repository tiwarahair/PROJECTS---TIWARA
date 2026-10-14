// The two-step verification dialog: open, step through, add an app, remove one.
import {
  confirmTwoFactorEnrolment,
  listTwoFactorDevices,
  removeTwoFactorApp,
  startTwoFactorEnrolment,
} from "../../lib/two-factor";
import type { StudioContext } from "./studio-actions";
import type { TwoFactorFlow } from "./studio-types";

const DEMO_CODE = "123456";

const WRONG_CODE =
  "That code isn’t right. Enter the latest code from your app.";

const FAILED = "That didn’t work. Check your connection and try again.";

const CLEARED_INPUT = {
  code: "",
  error: "",
  errorMessage: "",
  keyCopied: false,
};

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
    window.clearTimeout(timers.twoFactorNext);

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

  const goStep = (step: string, patch: Partial<TwoFactorFlow> = {}) =>
    setState(({ twoFactor }) => {
      if (!twoFactor) return { twoFactor };

      const { history = [], ...current } = twoFactor;

      return {
        twoFactor: {
          ...current,
          ...CLEARED_INPUT,
          ...patch,
          step,
          history: [...history, current],
        },
      };
    });

  const backTwoFactor = () => {
    memo.enrolmentRequest = (memo.enrolmentRequest ?? 0) + 1;

    setState(({ twoFactor }) => {
      const previous = twoFactor?.history?.at(-1);

      if (!twoFactor || !previous) return { twoFactor };

      return {
        twoFactor: {
          ...previous,
          ...CLEARED_INPUT,
          history: twoFactor.history?.slice(0, -1),
        },
      };
    });
  };

  const copyTwoFactorKey = (secret: string) =>
    void navigator.clipboard?.writeText(secret).then(
      () => {
        window.clearTimeout(timers.keyCopied);
        setTwoFactor({ keyCopied: true });

        timers.keyCopied = window.setTimeout(
          () => setTwoFactor({ keyCopied: false }),
          1500,
        );
      },
      () => undefined,
    );

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

      if (!isRight)
        return setTwoFactor({
          isBusy: false,
          error: "code",
          errorMessage: WRONG_CODE,
        });

      await onPass();
      setTwoFactor({ isBusy: false });
    } catch {
      setTwoFactor({ isBusy: false, error: "code", errorMessage: FAILED });
    }
  };

  /** The app step: a real account gets its QR code and key from Supabase. */
  const startEnrolment = () => {
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

  const beginEnrolment = (patch: Partial<TwoFactorFlow>) => {
    goStep("app", {
      ...patch,
      enrolment: null,
      isEnrolmentFailed: false,
      isVerified: false,
    });

    startEnrolment();
  };

  const retryEnrolment = () => {
    setTwoFactor({ enrolment: null, isEnrolmentFailed: false });
    startEnrolment();
  };

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

        if (twoFactor.kind === "main" || twoFactor.flow === "add") {
          setTwoFactor({ isVerified: true, isJustVerified: true });

          timers.twoFactorNext = window.setTimeout(() => {
            if (twoFactor.flow === "add") return closeTwoFactor();

            setTwoFactor({ isJustVerified: false });
            goStep("backup", { option: "device", skipWarn: false });
          }, 900);
        } else goStep("done");

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
        const kept = devices
          .filter((item) => item !== device)
          .map((item, index) => ({ ...item, backup: index > 0 }));

        const next = isReal()
          ? await listTwoFactorDevices().catch(() => kept)
          : kept;

        setState({ twoFactorSettings: { devices: next } });
        closeTwoFactor();
        showToast(`${twoFactor.name} removed`);
      },
    );
  };

  return {
    openTwoFactor,
    closeTwoFactor,
    setTwoFactor,
    goStep,
    backTwoFactor,
    copyTwoFactorKey,
    beginEnrolment,
    retryEnrolment,
    verifyTwoFactor,
    removeTwoFactorDevice,
    withCode,
  };
};
