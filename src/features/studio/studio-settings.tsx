import { Fragment } from "react";
import { Link, useNavigate } from "react-router";
import { Avatar } from "../../components/ds/avatar";
import { AccountSettings } from "../../components/account-settings/account-settings";
import { BusinessDetails } from "../../components/business-details/business-details";
import { PaymentPolicy } from "../../components/payment-policy/payment-policy";
import { getAssetUrl } from "../../utils/asset-url";
import { joinClassNames } from "../../utils/class-names";
import { AvailabilityPage, ProfilePage, RulesPage } from "./settings-pages";
import { getSettingsView } from "./settings-view";
import type { SettingsIcon, SettingsView } from "./settings-view";
import { GATE_REASON } from "./studio-data";
import type { StudioController } from "./use-studio";
import styles from "../../styles/features/studio/studio-settings.module.css";
import { getProfilePath } from "./studio-model";
import { useAccountBackend } from "./use-account-backend";
import { useSignOut } from "../../hooks/use-sign-out";

const STROKE = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "1.7",
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

/** The row / nav icons (a named icon or a single path). */
const SettingsGlyph = ({
  icon,
  path,
  size,
  className,
}: {
  icon: SettingsIcon;
  path: string;
  size: string;
  className?: string;
}) => {
  if (path)
    return (
      <svg
        className={className}
        width={size}
        height={size}
        viewBox="0 0 24 24"
        {...STROKE}
      >
        <path d={path}></path>
      </svg>
    );

  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      {...STROKE}
    >
      {icon === "clock" && (
        <>
          <path d="M12 6v6l4 2"></path>
          <circle cx="12" cy="12" r="10"></circle>
        </>
      )}
      {icon === "rules" && (
        <>
          <path d="m3 17 2 2 4-4"></path>
          <path d="m3 7 2 2 4-4"></path>
          <path d="M13 6h8"></path>
          <path d="M13 12h8"></path>
          <path d="M13 18h8"></path>
        </>
      )}
      {icon === "card" && (
        <>
          <rect width="20" height="14" x="2" y="5" rx="2"></rect>
          <line x1="2" x2="22" y1="10" y2="10"></line>
        </>
      )}
      {icon === "shop" && (
        <path d="M4 10v10h16V10M3 10l1.6-6h14.8L21 10M3 10c0 1.7 1.3 3 3 3s3-1.3 3-3c0 1.7 1.3 3 3 3s3-1.3 3-3c0 1.7 1.3 3 3 3s3-1.3 3-3"></path>
      )}
      {icon === "people" && (
        <>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
          <path d="M16 3.128a4 4 0 0 1 0 7.744"></path>
          <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
          <circle cx="9" cy="7" r="4"></circle>
        </>
      )}
      {icon === "link" && (
        <>
          <path d="M9 17H7A5 5 0 0 1 7 7h2"></path>
          <path d="M15 7h2a5 5 0 1 1 0 10h-2"></path>
          <line x1="8" x2="16" y1="12" y2="12"></line>
        </>
      )}
      {icon === "eye" && (
        <>
          <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"></path>
          <circle cx="12" cy="12" r="3"></circle>
        </>
      )}
      {icon === "user" && (
        <>
          <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </>
      )}
      {icon === "scis" && (
        <>
          <path d="M20 4 8.12 15.88"></path>
          <path d="M14.47 14.48 20 20"></path>
          <path d="M8.12 8.12 12 12"></path>
          <circle cx="6" cy="6" r="3"></circle>
          <circle cx="6" cy="18" r="3"></circle>
        </>
      )}
    </svg>
  );
};

const SignOutIcon = () => (
  <svg
    className={styles.noShrink}
    width="16"
    height="16"
    viewBox="0 0 24 24"
    {...STROKE}
  >
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
    <path d="m16 17 5-5-5-5"></path>
    <path d="M21 12H9"></path>
  </svg>
);

const LinkIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" {...STROKE} strokeWidth="1.8">
    <path d="M9 17H7A5 5 0 0 1 7 7h2"></path>
    <path d="M15 7h2a5 5 0 1 1 0 10h-2"></path>
    <line x1="8" x2="16" y1="12" y2="12"></line>
  </svg>
);

const EyeIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" {...STROKE} strokeWidth="1.8">
    <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"></path>
    <circle cx="12" cy="12" r="3"></circle>
  </svg>
);

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
                <svg
                  width="11"
                  height="11"
                  viewBox="0 0 24 24"
                  {...STROKE}
                  strokeWidth="1.8"
                >
                  <path d="M3 17V7a2 2 0 0 1 2-2h9v12"></path>
                  <path d="M14 9h4l3 4v4h-7"></path>
                  <circle cx="7.5" cy="17.5" r="2"></circle>
                  <circle cx="17.5" cy="17.5" r="2"></circle>
                </svg>
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
          <svg width="13" height="13" viewBox="0 0 24 24" {...STROKE}>
            <path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path>
          </svg>
          Edit
        </button>
      </div>
      {view.rootGroups.map(({ key, label, rows }) => (
        <Fragment key={key}>
          <div className={styles.groupLabel}>{label}</div>
          <div className={styles.group}>
            {rows.map((row) => (
              <button
                key={row.key}
                className={joinClassNames(
                  styles.row,
                  row.isLocked && styles.rowLocked,
                )}
                onClick={row.onSelect}
                aria-disabled={row.isLocked ? "true" : "false"}
              >
                <span className={styles.rowIcon}>
                  <SettingsGlyph
                    className={styles.blockIcon}
                    icon={row.icon}
                    path={row.path}
                    size="15"
                  />
                </span>
                <span className={styles.grow}>
                  <span className={styles.rowLabel}>{row.label}</span>
                  <span className={styles.rowSub}>{row.subtitle}</span>
                </span>
              </button>
            ))}
          </div>
        </Fragment>
      ))}
      <button className={styles.signOut} onClick={view.signOut}>
        <SignOutIcon />
        Sign out
      </button>
      <div className={styles.logoRow}>
        <img
          className={styles.logo}
          src={getAssetUrl("logos/logo-crimson.png")}
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
            {items.map((item) => (
              <button
                key={item.key}
                className={joinClassNames(
                  styles.navItem,
                  item.isCurrent && styles.navItemOn,
                )}
                onClick={item.onSelect}
              >
                <span className={styles.navIcon}>
                  <SettingsGlyph icon={item.icon} path={item.path} size="16" />
                </span>
                <span className={styles.navLabel}>{item.label}</span>
              </button>
            ))}
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
                <LinkIcon />
                Copy booking link
              </button>
              <Link className={styles.shareLink} to={getProfilePath(state)}>
                <EyeIcon />
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
                { key: "link", label: "Copy booking link", icon: <LinkIcon /> },
                {
                  key: "profile",
                  label: "View public profile",
                  icon: <EyeIcon />,
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
          <SignOutIcon />
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
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  {...STROKE}
                  strokeWidth="2"
                >
                  <path d="m15 18-6-6 6-6"></path>
                </svg>
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
