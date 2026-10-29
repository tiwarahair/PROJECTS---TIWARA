import { Controller } from "react-hook-form";
import { Info } from "lucide-react";
import { SaveError } from "../../lib/studio-writes";
import { joinClassNames } from "../../utils/class-names";
import { formatMoney } from "../../utils/money";
import { getCloseReason } from "./logic";
import { SettingsSection, TextField } from "./fields";
import { SettingsLoginDetails } from "./login-details";
import type { AccountSettingsProps } from "./use-account-settings";
import type { AccountSettingsController } from "./use-account-settings";
import shared from "../../styles/components/account-settings/index.module.css";
import styles from "../../styles/components/account-settings/personal.module.css";

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
  const { nameForm, toast, ask, getNameError } = settings;

  const {
    upcoming = 0,
    owed = 0,
    hasOpenDispute = false,
    isCloseChecking = false,
    onPayOwed,
    isPayingOwed,
  } = props;

  const closeReason = getCloseReason(upcoming, owed, hasOpenDispute);
  const canPayOwed = !!onPayOwed && owed > 0 && !upcoming && !hasOpenDispute;

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
            <Controller
              key={key}
              control={nameForm.control}
              name={key}
              render={({ field: { value, onChange } }) => (
                <TextField
                  id={`${uid}-${key}`}
                  label={label}
                  value={value}
                  error={getNameError(key)}
                  onChange={onChange}
                  className={styles.input}
                  autoComplete={autoComplete}
                />
              )}
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
              <Info className={shared.infoIcon} size={16} strokeWidth={1.7} />
              {closeReason}
            </div>
          )}
          {canPayOwed && (
            <button
              className={joinClassNames(styles.payOwed, shared.focusRing)}
              onClick={onPayOwed}
              disabled={isPayingOwed}
            >
              {isPayingOwed
                ? "Paying…"
                : `Pay ${formatMoney(owed, { pence: "always" })}`}
            </button>
          )}
          <button
            className={joinClassNames(
              styles.closeButton,
              shared.focusRing,
              closeReason || isCloseChecking
                ? styles.closeBlocked
                : styles.closeOpen,
            )}
            data-ac-in="1"
            disabled={!!closeReason || isCloseChecking}
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
                    .catch((error: unknown) =>
                      toast(
                        error instanceof SaveError
                          ? error.message
                          : "Your business couldn’t be closed. Try again.",
                      ),
                    ),
              )
            }
          >
            {isCloseChecking ? "Checking…" : "Close business"}
          </button>
        </div>
      </SettingsSection>
    </>
  );
};
