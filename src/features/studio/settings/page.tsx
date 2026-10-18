import { AccountSettings } from "../../../components/account-settings";
import { BusinessDetails } from "../../../components/business-details";
import { PaymentPolicy } from "../../../components/payment-policy";
import { joinClassNames } from "../../../utils/class-names";
import type { StudioController } from "../core/use-studio";
import { AvailabilityPage } from "./availability";
import { ProfilePage } from "./profile";
import { RulesPage } from "./rules";
import { SaveButtons } from "./save-buttons";
import type { useAccountBackend } from "./use-account-backend";
import type { SettingsView } from "./view";
import styles from "../../../styles/features/studio/settings/page.module.css";

export interface SettingsPageProps {
  studio: StudioController;
  view: SettingsView;
  account: ReturnType<typeof useAccountBackend>;
}

export const SettingsPage = ({ studio, view, account }: SettingsPageProps) => {
  const { state, isWide, isNew, props, actions } = studio;

  return (
    <div className={styles.page} data-screen-label="Settings page">
      <h1 className={styles.h1}>{view.pageTitle}</h1>
      {view.isProfile && <ProfilePage studio={studio} view={view} />}
      {view.isAvailability && <AvailabilityPage studio={studio} view={view} />}
      {view.isRules && <RulesPage studio={studio} view={view} />}
      {view.isBusiness && (
        <div className={styles.embedded} data-screen-label="Business details">
          <BusinessDetails
            embedded={true}
            value={state.business}
            stripe={state.check?.stripe ? "connected" : "none"}
            tax={state.tax}
            onEditTax={view.editTaxFromBusiness}
            onSave={view.onBusinessSave}
            onState={view.onBusinessState}
            onConnectStripe={view.connectStripe}
            hideSave={!isWide}
          />
        </div>
      )}
      {/* AccountSettings stays mounted on every settings page (hidden when not an account page) */}
      <div
        className={joinClassNames(
          styles.embedded,
          !view.isAccountShown && styles.hidden,
        )}
        data-screen-label="Account settings"
      >
        <AccountSettings
          embedded={true}
          page={view.accountPage}
          payoutStatus={view.payoutStatus}
          tax={state.tax}
          taxEditing={!!state.taxEdit}
          taxBusiness={state.business}
          taxLegalName={state.owner.name}
          person={state.owner}
          notifications={state.notificationPrefs}
          taxBusinessName={state.profile.salon}
          onTaxEdit={view.onTaxEdit}
          onTaxAdd={view.onTaxAdd}
          onTaxSave={view.onTaxSave}
          onTaxCancel={view.onTaxCancel}
          onTaxDirty={view.onTaxDirty}
          onTaxLearnMore={view.onTaxLearn}
          signIn={account.signIn ?? props.signIn ?? "email"}
          backend={account.backend}
          isNew={isNew}
          upcoming={view.accountUpcoming}
          onNavigate={view.onAccountNav}
          onToast={(text) => actions.showToast(text)}
          onState={view.onAccountState}
          onConnectStripe={view.connectStripe}
          onOpenStripe={view.openStripeDashboard}
          payoutBank={view.payoutBank}
          twoFactorDevices={state.twoFactorSettings.devices}
          onTwoFactorTurnOn={view.onTwoFactorTurnOn}
          onTwoFactorAddBackup={view.onTwoFactorAddBackup}
          onTwoFactorRemove={view.onTwoFactorRemove}
          hideSave={!isWide}
        />
      </div>
      {view.isPolicy && (
        <div className={styles.embedded} data-screen-label="Payment policy">
          <PaymentPolicy
            embedded={true}
            stylistName={state.profile.salon}
            value={state.policy}
            bookingsCount={view.policyBookings}
            onSave={view.onPolicySave}
            onState={view.onPolicyState}
            hideSave={!isWide}
          />
        </div>
      )}
      {isWide && view.hasOwnFooter && (
        <div className={styles.footer}>
          <SaveButtons
            view={view}
            className={styles.saveChanges}
            label="Save changes"
          />
        </div>
      )}
    </div>
  );
};
