// The two-step verification dialog: open, step through, add an app, remove one.
import type { StudioContext } from "./studio-actions";
import type { TwoFactorFlow } from "./studio-types";

const WRONG_CODE =
  "That code isn’t right. Enter the latest code from your app.";

export const createTwoFactorActions = (
  { getState, setState, timers }: StudioContext,
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

    if ((twoFactor.code || "").length < 6)
      return setTwoFactor({
        error: "code",
        errorMessage: "Enter the 6-digit code",
      });

    if (twoFactor.code !== "123456")
      return setTwoFactor({ error: "code", errorMessage: WRONG_CODE });

    setState({
      twoFactorSettings: {
        devices: devices.concat([
          { name, backup: twoFactor.kind === "backup" },
        ]),
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
      });
    else if (twoFactor.flow === "add") {
      closeTwoFactor();
      showToast("Backup added");
    } else
      setTwoFactor({ step: "done", code: "", error: "", errorMessage: "" });

    checkDone();
  };

  const removeTwoFactorDevice = () => {
    const { twoFactor, twoFactorSettings } = getState();

    if (!twoFactor) return;

    const devices = twoFactorSettings.devices;

    if (devices.length <= 1) {
      closeTwoFactor();

      return;
    }

    if ((twoFactor.code || "").length < 6)
      return setTwoFactor({
        error: "code",
        errorMessage: "Enter the 6-digit code",
      });

    if (twoFactor.code !== "123456")
      return setTwoFactor({ error: "code", errorMessage: WRONG_CODE });

    let next = devices.filter((device) => device.name !== twoFactor.name);

    if (!next.some(({ backup }) => !backup))
      next = next.map((device, index) =>
        index === 0 ? { ...device, backup: false } : device,
      );

    setState({ twoFactorSettings: { devices: next } });
    closeTwoFactor();
    showToast(`${twoFactor.name} removed`);
  };

  return {
    openTwoFactor,
    closeTwoFactor,
    setTwoFactor,
    verifyTwoFactor,
    removeTwoFactorDevice,
  };
};
