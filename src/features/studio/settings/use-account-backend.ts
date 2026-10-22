import type { AccountSettingsBackend } from "../../../components/account-settings/backend";
import {
  changePassword,
  sendEmailChangeCodes,
  sendReauthenticationCode,
  verifyEmailChangeCode,
} from "../../../lib/account-changes";
import {
  fetchAccountSecurity,
  saveLoginAlerts,
  signOutOtherSessions,
  signOutSession,
} from "../../../lib/account-security";
import { api, useUpdateProfileMutation } from "../../../stores/api-slice";
import {
  closeBusiness,
  fetchCalendarFeedUrl,
  resetCalendarFeed,
  saveNotificationPreference,
} from "../../../lib/studio-api/settings";
import { useAppDispatch, useAppSelector } from "../../../stores/hooks";
import { toNotificationEvent } from "../core/records";
import type { StudioController } from "../core/use-studio";

/** Settings → Account: Supabase Auth and the stylist's profile; null while nobody is signed in. */
export const useAccountBackend = ({ state, setState }: StudioController) => {
  const user = useAppSelector(({ session }) => session.user);
  const [updateProfile] = useUpdateProfileMutation();
  const dispatch = useAppDispatch();

  if (!user) return null;

  const { stylistId } = state.account;

  const backend: AccountSettingsBackend = {
    saveName: async (first, last) => {
      await updateProfile({ userId: user.id, patch: { first, last } }).unwrap();

      setState(({ owner }) => ({
        owner: { ...owner, first, last, name: `${first} ${last}` },
      }));
    },
    savePhone: async (mobile) => {
      await updateProfile({ userId: user.id, patch: { mobile } }).unwrap();
    },
    sendEmailCodes: sendEmailChangeCodes,
    verifyEmailCode: verifyEmailChangeCode,
    sendPasswordCode: sendReauthenticationCode,
    changePassword,
    getSecurity: fetchAccountSecurity,
    signOutSession,
    signOutOthers: signOutOtherSessions,
    saveLoginAlerts: (isOn) => saveLoginAlerts(user.id, isOn),
    getCalendarFeed: () => fetchCalendarFeedUrl(stylistId),
    resetCalendarFeed: () => resetCalendarFeed(stylistId),
    closeBusiness: async () => {
      await closeBusiness();
      dispatch(api.util.invalidateTags(["Studio", "StylistProfile", "Search"]));
    },
    saveNotification: async (key, setting) => {
      await saveNotificationPreference({
        stylist_id: stylistId,
        event: toNotificationEvent(key),
        ...setting,
      });

      setState(({ notificationPrefs }) => ({
        notificationPrefs: { ...notificationPrefs, [key]: setting },
      }));
    },
  };

  const signIn = user.providers.includes("email") ? "email" : "google";

  return { backend, signIn } as const;
};
