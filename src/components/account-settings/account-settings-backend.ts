// What Account settings saves through: a real account passes its own; demo boards use the stand-in.
import type { ChannelSetting, NotificationKey } from "./account-settings-logic";

export interface AccountSettingsBackend {
  saveName: (first: string, last: string) => Promise<void>;
  savePhone: (phone: string) => Promise<void>;
  /** Emails a code to the current address and one to the new address; an error code when it can't. */
  sendEmailCodes: (email: string) => Promise<string | null>;
  verifyEmailCode: (email: string, code: string) => Promise<boolean>;
  sendPasswordCode: () => Promise<void>;
  saveNotification: (
    key: NotificationKey,
    setting: ChannelSetting,
  ) => Promise<void>;
  /** Takes the booking page offline (reopenable for 15 days). */
  closeBusiness: () => Promise<void>;
  /** An error code when the password wasn't changed; `reauthentication_needed` asks for the emailed code. */
  changePassword: (
    password: string,
    code: string,
    signOutOthers: boolean,
  ) => Promise<string | null>;
}

const DEMO_CODE = "123456";

export const DEMO_BACKEND: AccountSettingsBackend = {
  saveName: () => Promise.resolve(),
  savePhone: () => Promise.resolve(),
  sendEmailCodes: () => Promise.resolve(null),
  verifyEmailCode: (email, code) =>
    Promise.resolve(!!email && code === DEMO_CODE),
  sendPasswordCode: () => Promise.resolve(),
  closeBusiness: () => Promise.resolve(),
  saveNotification: () => Promise.resolve(),
  changePassword: (password, code) => {
    if (!code) return Promise.resolve("reauthentication_needed");

    return Promise.resolve(
      password && code === DEMO_CODE ? null : "reauthentication_not_valid",
    );
  },
};
