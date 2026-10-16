import type { AccountSettingsBackend } from "../../../components/account-settings/backend";
import {
  changePassword,
  sendEmailChangeCodes,
  sendReauthenticationCode,
  verifyEmailChangeCode,
} from "../../../lib/account-changes";
import {
  useSetBusinessClosedMutation,
  useUpdateProfileMutation,
} from "../../../stores/api-slice";
import { saveNotificationPreference } from "../../../lib/studio-api";
import { useAppSelector } from "../../../stores/hooks";
import { toNotificationEvent } from "../core/records";
import type { StudioController } from "../core/use-studio";

/** Settings → Account for a real stylist: Supabase Auth and their profile; demo boards get none. */
export const useAccountBackend = ({ state, setState }: StudioController) => {
  const user = useAppSelector(({ session }) => session.user);
  const [updateProfile] = useUpdateProfileMutation();
  const [setBusinessClosed] = useSetBusinessClosedMutation();

  if (!user || !state.account) return {};

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
    closeBusiness: async () => {
      await setBusinessClosed(true).unwrap();
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
