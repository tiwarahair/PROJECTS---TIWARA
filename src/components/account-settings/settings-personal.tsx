import { joinClassNames } from "../../utils/class-names";
import { getCloseReason } from "./account-settings-logic";
import { InfoIcon, SettingsSection, TextField } from "./settings-fields";
import { SettingsLoginDetails } from "./settings-login-details";
import type { AccountSettingsProps } from "./use-account-settings";
import type { AccountSettingsController } from "./use-account-settings";
import shared from "../../styles/components/account-settings/account-settings.module.css";
import styles from "../../styles/components/account-settings/settings-personal.module.css";

interface SettingsPersonalProps {
  settings: AccountSettingsController;
  uid: string;
  props: AccountSettingsProps;
}

export const SettingsPersonal = ({
  settings,
  uid,
  props,
}: SettingsPersonalProps) => {
  const { state, setState, toast, ask, getNameError } = settings;

  const closeReason = getCloseReason(props.upcoming || 0, !!props.owed);

  return (
    <>
      <SettingsSection label="Your name" heading="Your name">
        <div className={styles.nameCard}>
          {(
            [
              ["first", "First name", "given-name"],
              ["last", "Last name", "family-name"],
            ] as const
          ).map(([key, label, autoComplete]) => (
            <TextField
              key={key}
              id={`${uid}-${key}`}
              label={label}
              value={state[key]}
              error={getNameError(key)}
              onChange={(event) => setState({ [key]: event.target.value })}
              className={styles.input}
              autoComplete={autoComplete}
            />
          ))}
        </div>
      </SettingsSection>

      <SettingsLoginDetails settings={settings} uid={uid} props={props} />

      <SettingsSection
        label="Close business"
        heading="Close business"
        className={styles.closeSection}
      >
        <div className={styles.closeCard}>
          <p className={styles.closeText}>
            Takes your booking page offline straight away. You can reopen it
            within 15 days; after that your business details and photos are
            deleted. Payment records are kept for tax purposes, and you can
            still log in and book as a client.
          </p>
          {!!closeReason && (
            <div className={styles.closeReason}>
              <InfoIcon className={shared.infoIcon} />
              {closeReason}
            </div>
          )}
          <button
            className={joinClassNames(
              styles.closeButton,
              shared.focusRing,
              closeReason ? styles.closeBlocked : styles.closeOpen,
            )}
            data-ac-in="1"
            disabled={!!closeReason}
            onClick={() =>
              ask(
                {
                  title: "Close your business?",
                  body: "Your booking page goes offline now. You can reopen it from Studio within 15 days.",
                  cta: "Close business",
                },
                () =>
                  settings.backend
                    .closeBusiness()
                    .then(() => toast("Business closed"))
                    .catch(() =>
                      toast("Your business couldn’t be closed. Try again."),
                    ),
              )
            }
          >
            Close business
          </button>
        </div>
      </SettingsSection>
    </>
  );
};
