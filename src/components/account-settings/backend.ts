// What Account settings saves through.
import type { AccountSecurity } from "../../lib/account-security";
import type { ChannelSetting, NotificationKey } from "./logic";

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
  /** where the account is signed in, and whether new-device emails are on. */
  getSecurity: () => Promise<AccountSecurity>;
  signOutSession: (id: string) => Promise<void>;
  signOutOthers: () => Promise<void>;
  /** False when they closed the code prompt instead of entering the code. */
  removeTrustedDevice: (id: string) => Promise<boolean>;
  saveLoginAlerts: (isOn: boolean) => Promise<void>;
  getCalendarFeed: () => Promise<string>;
  resetCalendarFeed: () => Promise<string>;
}
