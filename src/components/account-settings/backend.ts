import type { AccountSecurity } from "../../lib/account-security";
import type { ChannelSetting, NotificationKey } from "./logic";

export interface AccountSettingsBackend {
  saveName: (first: string, last: string) => Promise<void>;
  savePhone: (phone: string) => Promise<void>;
  sendEmailCodes: (email: string) => Promise<string | null>;
  verifyEmailCode: (email: string, code: string) => Promise<boolean>;
  sendPasswordCode: () => Promise<void>;
  saveNotification: (
    key: NotificationKey,
    setting: ChannelSetting,
  ) => Promise<void>;
  closeBusiness: () => Promise<void>;
  changePassword: (
    password: string,
    code: string,
    signOutOthers: boolean,
  ) => Promise<string | null>;
  getSecurity: () => Promise<AccountSecurity>;
  signOutSession: (id: string) => Promise<void>;
  signOutOthers: () => Promise<void>;
  saveLoginAlerts: (isOn: boolean) => Promise<void>;
  getCalendarFeed: () => Promise<string>;
  resetCalendarFeed: () => Promise<string>;
}
