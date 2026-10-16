import type { TwoFactorFlow } from "../types";
import type { FixtureSetup, FixtureTable } from "./context";
import { WRONG_CODE } from "./data";

type DeviceSet = "main" | "both";

const openFlow =
  (
    step: string,
    extra?: Partial<TwoFactorFlow>,
    devices?: DeviceSet,
  ): FixtureSetup =>
  (fixture) => {
    fixture.setBase(
      devices ? { twoFactorSettings: { devices: fixture[devices] } } : {},
    );

    fixture.actions.openTwoFactor(step, extra);
  };

const openSecurity =
  (devices: DeviceSet): FixtureSetup =>
  (fixture) =>
    fixture.setBase({
      tab: "settings",
      page: "security",
      twoFactorSettings: { devices: fixture[devices] },
    });

export const twoFactorFixtures: FixtureTable = {
  "secure-locked": openFlow("secure"),
  "secure-unlocked": openFlow("secure", {}, "both"),
  "tf-method": openFlow("method"),
  "tf-app": openFlow("app"),
  "tf-app-key": openFlow("app", { keyShown: true }),
  "tf-app-error": openFlow("app", {
    code: "482910",
    error: "code",
    errorMessage: WRONG_CODE,
  }),
  "tf-dup": openFlow(
    "app",
    {
      kind: "backup",
      option: "device",
      name: "Main phone",
      code: "",
      error: "name",
      errorMessage: "You already have a device with this name",
    },
    "main",
  ),
  "tf-backup": openFlow("backup", {}, "main"),
  "tf-backup-app": openFlow(
    "app",
    { kind: "backup", option: "pm", name: "Password manager" },
    "main",
  ),
  "tf-skip": openFlow("backup", { skipWarn: true }, "main"),
  "tf-done": openFlow("done", {}, "both"),
  "sec-off": ({ setBase }) => setBase({ tab: "settings", page: "security" }),
  "sec-on1": openSecurity("main"),
  "sec-on2": openSecurity("both"),
  "sec-remove": (fixture) => {
    openSecurity("both")(fixture);
    fixture.actions.openTwoFactor("remove", { name: "Password manager" });
  },
};
