import { ArrowRight } from "lucide-react";
import { joinClassNames } from "../../utils/class-names";
import { EmailCodesForm } from "./email-codes-form";
import { SettingsSection } from "./fields";
import { getLoginDetailsActions } from "./login-details-actions";
import { NewEmailForm } from "./new-email-form";
import { PhoneForm } from "./phone-form";
import type { AccountSettingsProps } from "./use-account-settings";
import type { AccountSettingsController } from "./use-account-settings";
import shared from "../../styles/components/account-settings/index.module.css";
import styles from "../../styles/components/account-settings/login-details.module.css";

interface SettingsLoginDetailsProps {
  settings: AccountSettingsController;
  uid: string;
  props: AccountSettingsProps;
}

/** Settings → Personal → Login details: the login email (a code to each address) and the mobile. */
export const SettingsLoginDetails = ({
  settings,
  uid,
  props,
}: SettingsLoginDetailsProps) => {
  const { state, setState } = settings;
  const login = getLoginDetailsActions(settings);

  return (
    <SettingsSection
      label="Login details"
      heading="Login details"
      intro={
        <>
          <p className={shared.introText}>
            Used for your account, security and payout messages. Client-facing
            contact details are in Business details.
          </p>
          <button
            className={joinClassNames(styles.linkButton, shared.focusRing)}
            data-ac-in="1"
            onClick={() => props.onNavigate?.("business")}
          >
            Business details
            <ArrowRight size={15} strokeWidth={1.7} />
          </button>
        </>
      }
    >
      <div className={shared.card}>
        <div className={shared.row}>
          <div className={shared.rowText}>
            <div className={shared.rowLabel}>Login email</div>
            <div className={shared.rowValue}>{state.email}</div>
          </div>
          {!state.emailFlow && !state.pendingEmail && (
            <button
              className={joinClassNames(shared.outlineButton, shared.focusRing)}
              data-ac-in="1"
              onClick={() => setState({ emailFlow: "edit" })}
            >
              Change
            </button>
          )}
        </div>
        {!!state.pendingEmail && (
          <EmailCodesForm settings={settings} login={login} uid={uid} />
        )}
        <NewEmailForm settings={settings} login={login} uid={uid} />

        <div className={styles.divider}></div>

        <div className={shared.row}>
          <div className={shared.rowText}>
            <div className={shared.rowLabel}>Mobile</div>
            <div className={styles.phoneValue}>{state.phone}</div>
          </div>
          {!state.phoneFlow && (
            <button
              className={joinClassNames(shared.outlineButton, shared.focusRing)}
              data-ac-in="1"
              onClick={() => setState({ phoneFlow: "edit" })}
            >
              Change
            </button>
          )}
        </div>
        <PhoneForm settings={settings} login={login} uid={uid} />
      </div>
    </SettingsSection>
  );
};
