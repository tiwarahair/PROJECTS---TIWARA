import { Fragment } from "react";
import { Link, useNavigate } from "react-router";
import { ChevronLeft, Eye, Link2, LogOut, Pencil, Truck } from "lucide-react";
import { Avatar } from "../../components/ds/avatar";
import { AccountSettings } from "../../components/account-settings/account-settings";
import { BusinessDetails } from "../../components/business-details/business-details";
import { PaymentPolicy } from "../../components/payment-policy/payment-policy";
import { getAssetUrl } from "../../utils/asset-url";
import { joinClassNames } from "../../utils/class-names";
import { AvailabilityPage } from "./settings-availability-page";
import { ProfilePage } from "./settings-profile-page";
import { RulesPage } from "./settings-rules-page";
import { getSettingsView } from "./settings-view";
import type { SettingsView } from "./settings-view";
import { GATE_REASON } from "./studio-data";
import type { StudioController } from "./use-studio";
import styles from "../../styles/features/studio/studio-settings.module.css";
import { getProfilePath } from "./studio-model";
import { useAccountBackend } from "./use-account-backend";
import { useSignOut } from "../../hooks/use-sign-out";

/** The narrow "More" tab: profile card and grouped settings rows. */
const SettingsRoot = ({
  studio,
  view,
}: {
  studio: StudioController;
  view: SettingsView;
}) => {
  const { state, actions } = studio;

  return (
    <div className={styles.root} data-screen-label="Settings">
      <div className={styles.profileCard}>
        <Avatar
          src={state.avatarUrl ?? undefined}
          name={state.owner.name}
          size={54}
        />
        <div className={styles.grow}>
          <div className={styles.salonRow}>
            <span className={styles.salon}>{state.profile.salon}</span>
            {state.profile.mobile && (
              <span className={styles.mobileBadge}>
                <Truck size={11} strokeWidth={1.8} />
                Mobile
              </span>
            )}
          </div>
          <div className={styles.addr}>{state.profile.address}</div>
        </div>
        <button
          className={styles.editProfile}
          onClick={() => actions.openSubpage("profile")}
        >
          <Pencil size={13} strokeWidth={1.7} />
          Edit
        </button>
      </div>
      {view.rootGroups.map(({ key, label, rows }) => (
        <Fragment key={key}>
          <div className={styles.groupLabel}>{label}</div>
          <div className={styles.group}>
            {rows.map(
              ({
                key: rowKey,
                label: rowLabel,
                subtitle,
                icon: RowIcon,
                isLocked,
                onSelect,
              }) => (
                <button
                  key={rowKey}
                  className={joinClassNames(
                    styles.row,
                    isLocked && styles.rowLocked,
                  )}
                  onClick={onSelect}
                  aria-disabled={isLocked ? "true" : "false"}
                >
                  <span className={styles.rowIcon}>
                    <RowIcon
                      className={styles.blockIcon}
                      size={18}
                      strokeWidth={1.8}
                    />
                  </span>
                  <span className={styles.grow}>
                    <span className={styles.rowLabel}>{rowLabel}</span>
                    <span className={styles.rowSub}>{subtitle}</span>
                  </span>
                </button>
              ),
            )}
          </div>
        </Fragment>
      ))}
      <button className={styles.signOut} onClick={view.signOut}>
        <LogOut className={styles.noShrink} size={16} strokeWidth={1.7} />
        Sign out
      </button>
      <div className={styles.logoRow}>
        <img
          className={styles.logo}
          src={getAssetUrl("logos/logo-crimson-sm.png")}
          alt="Tiwára's House"
        />
      </div>
    </div>
  );
};

const SettingsNav = ({
  studio,
  view,
}: {
  studio: StudioController;
  view: SettingsView;
}) => {
  const { state, setState } = studio;

  const showTip = () => {
    if (!studio.context.getState().shareTip) setState({ shareTip: true });
  };

  const hideTip = () => {
    if (studio.context.getState().shareTip) setState({ shareTip: false });
  };

  return (
    <aside
      className={joinClassNames(
        styles.nav,
        view.isNavDesktop && styles.navDesk,
      )}
      data-screen-label="Settings nav"
    >
      <div className={styles.navTitle}>Settings</div>
      {view.navGroups.map(({ key, label, isFirst, items }) => (
        <div
          key={key}
          className={joinClassNames(
            styles.navGroup,
            isFirst && styles.navGroupFirst,
          )}
        >
          <div className={styles.navGroupLabel}>{label}</div>
          <div className={styles.navList}>
            {items.map(
              ({
                key: itemKey,
                label: itemLabel,
                icon: ItemIcon,
                isCurrent,
                onSelect,
              }) => (
                <button
                  key={itemKey}
                  className={joinClassNames(
                    styles.navItem,
                    isCurrent && styles.navItemOn,
                  )}
                  onClick={onSelect}
                >
                  <span className={styles.navIcon}>
                    <ItemIcon size={16} strokeWidth={1.7} />
                  </span>
                  <span className={styles.navLabel}>{itemLabel}</span>
                </button>
              ),
            )}
          </div>
        </div>
      ))}
      <div className={styles.share}>
        <div className={styles.shareLabel}>Share</div>
        <div
          className={styles.shareStack}
          onMouseEnter={showTip}
          onMouseLeave={hideTip}
        >
          {view.isShareLive && (
            <>
              <button className={styles.shareButton} onClick={view.copyLink}>
                <Link2 size={15} strokeWidth={1.8} />
                Copy booking link
              </button>
              <Link className={styles.shareLink} to={getProfilePath(state)}>
                <Eye size={15} strokeWidth={1.8} />
                View public profile
              </Link>
            </>
          )}
          {!view.isShareLive && (
            <>
              {state.shareTip && (
                <div className={styles.shareTip} role="tooltip" id="share-tip">
                  {GATE_REASON}
                </div>
              )}
              {[
                {
                  key: "link",
                  label: "Copy booking link",
                  icon: <Link2 size={15} strokeWidth={1.8} />,
                },
                {
                  key: "profile",
                  label: "View public profile",
                  icon: <Eye size={15} strokeWidth={1.8} />,
                },
              ].map(({ key, label, icon }) => (
                <button
                  key={key}
                  className={styles.shareLocked}
                  aria-disabled="true"
                  aria-describedby="share-tip"
                  onFocus={showTip}
                  onBlur={hideTip}
                  onClick={() => setState({ shareTip: !state.shareTip })}
                >
                  {icon}
                  {label}
                </button>
              ))}
            </>
          )}
        </div>
        <button className={styles.navSignOut} onClick={view.signOut}>
          <LogOut className={styles.noShrink} size={16} strokeWidth={1.7} />
          Sign out
        </button>
      </div>
    </aside>
  );
};

const HostSave = ({
  isOn,
  onClick,
}: {
  isOn: boolean;
  onClick: () => void;
}) => (
  <button
    className={joinClassNames(styles.hostSave, isOn && styles.hostSaveOn)}
    onClick={onClick}
    disabled={!isOn}
  >
    Save
  </button>
);

/** One settings page with the wide nav or the narrow back bar. */
const SettingsFrame = ({
  studio,
  view,
}: {
  studio: StudioController;
  view: SettingsView;
}) => {
  const { state, isWide, isDesktop, isNew, props, actions } = studio;
  const account = useAccountBackend(studio);

  return (
    <div
      className={joinClassNames(
        styles.frame,
        isWide && (isDesktop ? styles.frameDesk : styles.frameWide),
      )}
      data-screen-label="Settings"
    >
      {isWide && <SettingsNav studio={studio} view={view} />}
      <div className={styles.content}>
        {!isWide && (
          <div className={styles.backBar}>
            <div className={styles.backRow}>
              <button className={styles.backButton} onClick={actions.closePage}>
                <ChevronLeft size={18} strokeWidth={2} />
                Settings
              </button>
              <div className={styles.spacer}></div>
              {view.isAvailability && (
                <button className={styles.save} onClick={view.saveAvailability}>
                  Save
                </button>
              )}
              {view.isProfile && (
                <button className={styles.save} onClick={view.saveProfile}>
                  Save
                </button>
              )}
              {view.isRules && (
                <button className={styles.save} onClick={view.saveRules}>
                  Save
                </button>
              )}
              {view.isPolicy && (
                <HostSave
                  isOn={!!state.policyCanSave}
                  onClick={view.savePolicyHeader}
                />
              )}
              {view.hasAccountSave && (
                <HostSave
                  isOn={!!state.accountCanSave}
                  onClick={view.saveAccountHeader}
                />
              )}
              {view.isBusiness && (
                <HostSave
                  isOn={!!state.businessCanSave}
                  onClick={view.saveBusinessHeader}
                />
              )}
            </div>
          </div>
        )}
        <div
          className={joinClassNames(
            styles.pagePad,
            isDesktop ? styles.pagePadDesk : isWide && styles.pagePadWide,
          )}
        >
          <div className={styles.page} data-screen-label="Settings page">
            <h1 className={styles.h1}>{view.pageTitle}</h1>
            {view.isProfile && <ProfilePage studio={studio} view={view} />}
            {view.isAvailability && (
              <AvailabilityPage studio={studio} view={view} />
            )}
            {view.isRules && <RulesPage studio={studio} view={view} />}
            {view.isBusiness && (
              <div
                className={styles.embedded}
                data-screen-label="Business details"
              >
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
              <div
                className={styles.embedded}
                data-screen-label="Payment policy"
              >
                <PaymentPolicy
                  embedded={true}
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
                {view.isAvailability && (
                  <button
                    className={styles.saveChanges}
                    onClick={view.saveAvailability}
                  >
                    Save changes
                  </button>
                )}
                {view.isProfile && (
                  <button
                    className={styles.saveChanges}
                    onClick={view.saveProfile}
                  >
                    Save changes
                  </button>
                )}
                {view.isRules && (
                  <button
                    className={styles.saveChanges}
                    onClick={view.saveRules}
                  >
                    Save changes
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/** Studio → Settings: the narrow root menu or a settings page. */
export const StudioSettings = ({ studio }: { studio: StudioController }) => {
  const navigate = useNavigate();
  const signOut = useSignOut();
  const view = getSettingsView(studio, navigate, signOut);

  return (
    <>
      {view.isRootMobile && <SettingsRoot studio={studio} view={view} />}
      {view.isPage && <SettingsFrame studio={studio} view={view} />}
    </>
  );
};
