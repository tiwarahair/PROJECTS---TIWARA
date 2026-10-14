import type { CSSProperties, ReactNode } from "react";
import { TaxDetailsForm } from "../../components/tax-details-form/tax-details-form";
import { joinClassNames } from "../../utils/class-names";
import { getOverlayAnimation } from "./studio-overlay";
import { getTwoFactorView } from "./two-factor-view";
import type { TwoFactorView } from "./two-factor-view";
import type { StudioController } from "./use-studio";
import overlay from "../../styles/features/studio/studio-overlay.module.css";
import styles from "../../styles/features/studio/two-factor.module.css";

const asStyle = (values: Record<string, string>) => values as CSSProperties;

const CloseIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
  >
    <path d="M18 6 6 18M6 6l12 12"></path>
  </svg>
);

const PhoneIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="6" y="2" width="12" height="20" rx="2"></rect>
    <path d="M11 18h2"></path>
  </svg>
);

/** The disabled "Text message (SMS) · Coming soon" row. */
const SmsRow = () => (
  <div className={styles.sms} aria-disabled="true">
    <span className={styles.smsIcon}>
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
      </svg>
    </span>
    <div className={styles.smsText}>
      <span className={styles.title15}>Text message (SMS)</span>
      <span className={styles.soon}>Coming soon</span>
    </div>
  </div>
);

/** The 6-digit code field shared by the tax-code, app and remove steps. */
const CodeField = ({ view, label }: { view: TwoFactorView; label: string }) => (
  <>
    <label className={styles.label} htmlFor="tf-code">
      {label}
    </label>
    <input
      id="tf-code"
      className={joinClassNames(
        styles.code,
        view.isCodeError && styles.inputError,
      )}
      value={view.code}
      onChange={view.onCode}
      inputMode="numeric"
      autoComplete="one-time-code"
      maxLength={6}
      placeholder="000000"
      aria-invalid={view.isCodeError ? "true" : "false"}
    />
    {view.isCodeError && (
      <div className={styles.error} role="alert">
        {view.errorMessage}
      </div>
    )}
  </>
);

const BackupOption = ({
  option,
  label,
  icon,
}: {
  option: TwoFactorView["optionDevice"];
  label: string;
  icon: ReactNode;
}) => (
  <button
    className={joinClassNames(styles.option, option.isOn && styles.optionOn)}
    role="radio"
    aria-checked={option.isOn ? "true" : "false"}
    onClick={option.pick}
  >
    <span className={styles.optionIcon}>{icon}</span>
    <span className={styles.optionLabel}>{label}</span>
    <span className={styles.optionRing} aria-hidden="true">
      <span className={styles.optionDot}></span>
    </span>
  </button>
);

const TwoFactorBody = ({
  studio,
  view,
}: {
  studio: StudioController;
  view: TwoFactorView;
}) => {
  const { state } = studio;

  return (
    <>
      {view.isSecure && (
        <div className={styles.parts}>
          {view.parts.map((part) => {
            const isLocked = !part.isDone && !part.isUnlocked;

            return (
              <div
                key={part.key}
                className={styles.part}
                aria-disabled={isLocked ? "true" : "false"}
              >
                {part.isDone ? (
                  <span className={styles.partDone}>
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M20 6 9 17l-5-5"></path>
                    </svg>
                  </span>
                ) : (
                  <span
                    className={joinClassNames(
                      styles.partNumber,
                      isLocked && styles.locked,
                    )}
                  >
                    {part.stepNumber}
                  </span>
                )}
                <div className={styles.grow}>
                  <div
                    className={joinClassNames(
                      styles.partLabel,
                      isLocked && styles.locked,
                    )}
                  >
                    {part.label}
                  </div>
                  <div className={styles.partSub}>{part.subtitle}</div>
                </div>
                {!part.isDone && part.isUnlocked && (
                  <button className={styles.partButton} onClick={part.onSelect}>
                    {part.buttonLabel}
                  </button>
                )}
                {isLocked && (
                  <span className={styles.lock} aria-hidden="true">
                    <svg
                      width="17"
                      height="17"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="4" y="11" width="16" height="10" rx="2"></rect>
                      <path d="M8 11V7a4 4 0 0 1 8 0v4"></path>
                    </svg>
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
      {view.isTax && (
        <div className={styles.tax}>
          <TaxDetailsForm
            mode="setup"
            fixture={view.taxFixture}
            value={state.tax ?? undefined}
            business={state.business}
            legalName={state.owner.name}
            businessName={state.profile.salon}
            onSubmit={view.taxSubmit}
          />
        </div>
      )}
      {view.isLearn && (
        <>
          <div className={styles.learn}>
            <p className={styles.para}>
              Since 1 January 2024, online platforms in the UK have to report
              what sellers earn through them to HMRC. Tiwára’s House counts as
              one of these platforms.
            </p>
            <div className={styles.reportBox}>
              <div className={styles.reportTitle}>Once a year, we report</div>
              <ul className={styles.reportList}>
                <li>Your legal name, date of birth and home address</li>
                <li>Your National Insurance number, or your company number</li>
                <li>What you earned through Tiwára’s House that year</li>
              </ul>
            </div>
            <p className={styles.para}>
              We send you a copy of what we share by 31 January. Reporting
              doesn’t change the tax you owe. You still declare your income to
              HMRC as you do now.
            </p>
          </div>
          <button className={styles.primary} onClick={view.learnGo}>
            {view.learnLabel}
          </button>
        </>
      )}
      {view.isTaxCode && (
        <>
          <CodeField view={view} label="6-digit code" />
          <button className={styles.primary} onClick={view.taxCodeGo}>
            Continue
          </button>
        </>
      )}
      {view.isMethod && (
        <>
          <div
            className={styles.radios}
            role="radiogroup"
            aria-label="Verification method"
          >
            <button className={styles.app} role="radio" aria-checked="true">
              <span className={styles.appIcon}>
                <PhoneIcon />
              </span>
              <span className={styles.grow}>
                <span className={styles.titleRow}>
                  <span className={styles.appName}>Authenticator app</span>
                  <span className={styles.recommended}>Recommended</span>
                </span>
                <span className={styles.appSub}>
                  Use a free app like Google Authenticator, Microsoft
                  Authenticator or your password manager.
                </span>
              </span>
              <span className={styles.ring} aria-hidden="true">
                <span className={styles.ringDot}></span>
              </span>
            </button>
            <SmsRow />
          </div>
          <button className={styles.primary} onClick={view.toApp}>
            Continue
          </button>
        </>
      )}
      {view.isApp && (
        <>
          <label className={styles.label} htmlFor="tf-name">
            Name this device
          </label>
          <input
            id="tf-name"
            className={joinClassNames(
              styles.nameInput,
              view.isNameError && styles.inputError,
            )}
            value={view.name}
            onChange={view.onName}
            aria-invalid={view.isNameError ? "true" : "false"}
          />
          {view.isNameError && (
            <div className={styles.error} role="alert">
              {view.errorMessage}
            </div>
          )}
          {view.isOpenAppShown && view.appLink && (
            <a className={styles.openApp} href={view.appLink}>
              <PhoneIcon />
              Open in authenticator app
            </a>
          )}
          {view.isOpenAppShown &&
            !view.appLink &&
            !view.isQrLoading &&
            !view.isQrFailed && (
              <button className={styles.openApp} onClick={view.openApp}>
                <PhoneIcon />
                Open in authenticator app
              </button>
            )}
          <div className={styles.qrWrap}>
            {view.qrImage && (
              <img
                className={styles.qrImage}
                src={view.qrImage}
                alt="QR code for your authenticator app"
              />
            )}
            {view.isQrLoading && (
              <div className={styles.qrLoading} role="status">
                Getting your QR code…
              </div>
            )}
            {view.isQrFailed && (
              <div className={styles.qrLoading} role="alert">
                Your QR code couldn’t load.
                <button className={styles.keyToggle} onClick={view.retryQr}>
                  Try again
                </button>
              </div>
            )}
            <div
              className={joinClassNames(
                styles.qr,
                !view.qrCells.length && styles.hidden,
              )}
              role="img"
              aria-label="QR code for your authenticator app"
            >
              {view.qrCells.map(({ key, background }) => (
                <span
                  key={key}
                  className={styles.qrCell}
                  // runtime: each QR module is dark or light
                  style={asStyle({ "--cell": background })}
                ></span>
              ))}
            </div>
            <button
              className={styles.keyToggle}
              onClick={view.toggleKey}
              aria-expanded={view.isKeyOn ? "true" : "false"}
            >
              Can’t scan? Enter this key instead
            </button>
            {view.isKeyOn && (
              <div className={styles.key}>
                <span className={styles.keyText}>{view.keyText}</span>
                <button className={styles.copy} onClick={view.copyKey}>
                  Copy
                </button>
              </div>
            )}
          </div>
          <CodeField view={view} label="Enter the 6-digit code from the app" />
          <button className={styles.primary} onClick={view.verify}>
            {view.verifyLabel}
          </button>
        </>
      )}
      {view.isBackupStep && (
        <>
          <div
            className={styles.radios}
            role="radiogroup"
            aria-label="Backup method"
          >
            <BackupOption
              option={view.optionDevice}
              label="Another phone or tablet"
              icon={<PhoneIcon />}
            />
            <BackupOption
              option={view.optionManager}
              label="A password manager"
              icon={
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="7.5" cy="15.5" r="4.5"></circle>
                  <path d="m10.7 12.3 9.3-9.3M17 6l3 3M14 9l2 2"></path>
                </svg>
              }
            />
            <SmsRow />
          </div>
          {view.isSkipWarn && (
            <div className={styles.warn} role="alert">
              <svg
                className={styles.warnIcon}
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--accent-500,#b5541f)"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 9v4M12 17h.01"></path>
                <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"></path>
              </svg>
              <span>
                Without a backup, you’ll need to contact support if you lose
                your phone.
              </span>
            </div>
          )}
          <button className={styles.primary} onClick={view.addBackup}>
            Add backup
          </button>
          {view.isSkipShown && (
            <button className={styles.skip} onClick={view.skip}>
              Skip for now
            </button>
          )}
        </>
      )}
      {view.isDone && (
        <button className={styles.primary} onClick={view.doneGo}>
          {view.doneLabel}
        </button>
      )}
      {view.isRemove && (
        <>
          <CodeField view={view} label="6-digit code" />
          <div className={styles.row10}>
            <button className={styles.cancel} onClick={view.close}>
              Cancel
            </button>
            <button className={styles.remove} onClick={view.removeGo}>
              Remove
            </button>
          </div>
        </>
      )}
    </>
  );
};

/** Get paid / two-step verification. */
export const TwoFactorDialog = ({ studio }: { studio: StudioController }) => {
  const view = getTwoFactorView(studio);

  if (!view) return null;

  const { isWide } = view;

  return (
    <>
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
      <div
        className={joinClassNames(
          styles.scrim,
          view.isOut ? overlay.scrimOut16 : overlay.scrimIn26,
        )}
        onClick={view.close}
      ></div>
      <div
        className={joinClassNames(
          styles.dialog,
          isWide && styles.dialogWide,
          getOverlayAnimation(view.isOut, "dialog", isWide),
        )}
        role="dialog"
        aria-modal="true"
        aria-label={view.title}
        data-screen-label="Two-step verification"
      >
        {view.isDone && (
          <div className={styles.doneClose}>
            <button
              className={styles.iconButton}
              onClick={view.close}
              aria-label="Close"
            >
              <CloseIcon />
            </button>
          </div>
        )}
        {view.isDone && (
          <span className={styles.tick}>
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 6 9 17l-5-5"></path>
            </svg>
          </span>
        )}
        {view.isProgressShown && (
          <div className={styles.progress}>{view.progress}</div>
        )}
        <div className={styles.head}>
          {view.canBack && (
            <button
              className={joinClassNames(styles.iconButton, styles.back)}
              onClick={view.back}
              aria-label="Back"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m15 18-6-6 6-6"></path>
              </svg>
            </button>
          )}
          <h2
            className={joinClassNames(
              styles.title,
              view.isCentred && styles.centred,
            )}
          >
            {view.title}
          </h2>
          {view.isFinishLater && (
            <button className={styles.finishLater} onClick={view.close}>
              Finish later
            </button>
          )}
          {view.isCloseShown && (
            <button
              className={joinClassNames(styles.iconButton, styles.headClose)}
              onClick={view.close}
              aria-label="Close"
            >
              <CloseIcon />
            </button>
          )}
        </div>
        <p
          className={joinClassNames(
            styles.sub,
            view.isCentred && styles.centred,
          )}
        >
          {view.subtitle}
          {view.hasLearn && (
            <>
              {" "}
              <button className={styles.learnMore} onClick={view.openLearn}>
                Learn more
              </button>
            </>
          )}
        </p>
        <TwoFactorBody studio={studio} view={view} />
      </div>
    </>
  );
};
