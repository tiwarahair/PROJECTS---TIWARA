import { useRef } from "react";
import { Bell, Check, Lock } from "lucide-react";
import { ALWAYS_ON, CLIENT_MESSAGES, NOTIFICATION_GROUPS } from "./logic";
import type { ChannelSetting, NotificationKey } from "./logic";
import type { AccountSettingsProps } from "./use-account-settings";
import type { AccountSettingsController } from "./use-account-settings";
import { SettingsSection, Switch } from "./fields";
import shared from "../../styles/components/account-settings/index.module.css";
import notifications from "../../styles/components/account-settings/notifications.module.css";

interface SettingsNotificationsProps {
  settings: AccountSettingsController;
  uid: string;
  props: AccountSettingsProps;
}

export const SettingsNotifications = ({
  settings: { state, setState, toast, backend },
}: SettingsNotificationsProps) => {
  // saves run one at a time, in order
  const saving = useRef(Promise.resolve());

  const toggle = (key: NotificationKey, channel: keyof ChannelSetting) => {
    const before = state.notifications[key];
    const next = { ...before, [channel]: !before[channel] };

    setState(({ notifications: current }) => ({
      notifications: { ...current, [key]: next },
    }));

    saving.current = saving.current
      .then(() => backend.saveNotification(key, next))
      .then(
        () => toast("Notification settings saved"),
        () => {
          setState(({ notifications: current }) =>
            current[key] === next
              ? { notifications: { ...current, [key]: before } }
              : {},
          );

          toast("Your notification settings couldn’t be saved. Try again.");
        },
      );
  };

  return (
    <>
      {NOTIFICATION_GROUPS.map(([title, rows]) => (
        <SettingsSection key={title} label={title} heading={title}>
          <div className={notifications.groupCard}>
            <div className={notifications.groupHead} aria-hidden="true">
              <span></span>
              <span>Email</span>
              <span>SMS</span>
            </div>
            {rows.map(([key, label]) => (
              <div key={key} className={notifications.groupRow}>
                <span className={notifications.rowLabel}>{label}</span>
                {(
                  [
                    ["email", " by email"],
                    ["sms", " by SMS"],
                  ] as const
                ).map(([channel, suffix]) => (
                  <Switch
                    key={channel}
                    isOn={state.notifications[key][channel]}
                    label={label + suffix}
                    className={notifications.switchCell}
                    onToggle={() => toggle(key, channel)}
                  />
                ))}
              </div>
            ))}
          </div>
        </SettingsSection>
      ))}

      <SettingsSection
        label="Always on"
        heading="Always on"
        intro={
          <p className={shared.introText}>
            {/* TO DO: say "email and SMS" again once these have SMS templates */}
            Sent by email. These can’t be turned off.
          </p>
        }
      >
        <div className={notifications.alwaysCard}>
          {ALWAYS_ON.map((label) => (
            <div key={label} className={notifications.alwaysRow}>
              <span className={notifications.alwaysLabel}>{label}</span>
              <span className={notifications.alwaysTag}>
                <Lock size={14} strokeWidth={1.5} />
                Always on
              </span>
            </div>
          ))}
        </div>
      </SettingsSection>

      <SettingsSection
        label="Messages clients receive"
        heading="Messages your clients receive"
      >
        <div className={shared.quietCard}>
          <p className={notifications.clientText}>
            Clients always get these, so they know where they stand.
          </p>
          <div className={shared.actions}>
            {CLIENT_MESSAGES.map((message) => (
              <span key={message} className={notifications.clientChip}>
                <Check
                  className={notifications.clientTick}
                  size={13}
                  strokeWidth={2}
                />
                {message}
              </span>
            ))}
          </div>
        </div>
      </SettingsSection>
      <p className={notifications.bellNote}>
        <Bell size={16} strokeWidth={1.7} />
        Everything also appears in your notification bell.
      </p>
    </>
  );
};
