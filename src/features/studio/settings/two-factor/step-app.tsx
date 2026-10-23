import { Check, Copy, Smartphone } from "lucide-react";
import { useState } from "react";
import { joinClassNames } from "../../../../utils/class-names";
import { BusyButton, CodeField } from "./fields";
import type { TwoFactorView } from "./view";
import styles from "../../../../styles/features/studio/settings/two-factor/index.module.css";

/** what the app step needs, so Admin's two-step gate can show it too */
export type AppStepView = Pick<
  TwoFactorView,
  | "appLink"
  | "code"
  | "copyKey"
  | "errorMessage"
  | "isBusy"
  | "isCodeError"
  | "isKeyCopied"
  | "isKeyOn"
  | "isNameError"
  | "isOpenAppShown"
  | "isQrFailed"
  | "isQrLoading"
  | "isSetUp"
  | "isVerified"
  | "keyText"
  | "name"
  | "onCode"
  | "onName"
  | "openApp"
  | "qrImage"
  | "retryQr"
  | "toBackup"
  | "toggleKey"
  | "verify"
  | "verifyLabel"
>;

interface StepAppProps {
  view: AppStepView;
}

interface QrCodeProps extends StepAppProps {
  /** phones can't scan their own screen, so the QR waits behind a link there */
  isQrTucked: boolean;
}

/** Back on an app that's already on: just its name and a way forward. */
const SetUpApp = ({ view }: StepAppProps) => (
  <>
    <div className={styles.part}>
      <span className={styles.partDone}>
        <Check size={14} strokeWidth={3} />
      </span>
      <div className={styles.partLabel}>Set up as “{view.name}”</div>
    </div>
    <button className={styles.primary} onClick={view.toBackup}>
      Continue
    </button>
  </>
);

const SetupKey = ({ view }: StepAppProps) => (
  <div className={styles.key}>
    <span className={styles.keyText}>{view.keyText}</span>
    <button
      className={styles.copy}
      onClick={view.copyKey}
      aria-label={view.isKeyCopied ? "Key copied" : "Copy key"}
    >
      <Copy
        size={16}
        className={joinClassNames(
          styles.copyIcon,
          view.isKeyCopied && styles.copyIconOut,
        )}
      />
      <Check
        size={16}
        className={joinClassNames(
          styles.copyIcon,
          !view.isKeyCopied && styles.copyIconOut,
        )}
      />
    </button>
  </div>
);

const QrCode = ({ view, isQrTucked }: QrCodeProps) => {
  const [isQrShown, setQrShown] = useState(!isQrTucked);

  return (
    <div
      className={joinClassNames(styles.qrWrap, !isQrShown && styles.qrTucked)}
    >
      {!isQrShown && (
        <button className={styles.keyToggle} onClick={() => setQrShown(true)}>
          Show QR code
        </button>
      )}
      {isQrShown && view.qrImage && (
        <img
          className={styles.qrImage}
          src={view.qrImage}
          alt="QR code for your authenticator app"
        />
      )}
      {isQrShown && view.isQrLoading && (
        <div className={styles.qrLoading} role="status">
          Getting your QR code…
        </div>
      )}
      {isQrShown && view.isQrFailed && (
        <div className={styles.qrLoading} role="alert">
          Your QR code couldn’t load.
          <button className={styles.keyToggle} onClick={view.retryQr}>
            Try again
          </button>
        </div>
      )}
      <button
        className={styles.keyToggle}
        onClick={view.toggleKey}
        aria-expanded={view.isKeyOn ? "true" : "false"}
      >
        Can’t scan? Enter this key instead
      </button>
      {view.isKeyOn && <SetupKey view={view} />}
    </div>
  );
};

interface StepAppViewProps extends StepAppProps {
  isQrTucked?: boolean;
}

/** Name the device, scan the QR (or enter the key), then confirm with a code. */
export const StepApp = ({ view, isQrTucked = false }: StepAppViewProps) => {
  if (view.isSetUp) return <SetUpApp view={view} />;

  return (
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
        readOnly={view.isVerified}
        aria-invalid={view.isNameError ? "true" : "false"}
      />
      {view.isNameError && (
        <div className={styles.error} role="alert">
          {view.errorMessage}
        </div>
      )}
      {view.isOpenAppShown && view.appLink && (
        <a className={styles.openApp} href={view.appLink}>
          <Smartphone size={18} strokeWidth={1.7} />
          Open in authenticator app
        </a>
      )}
      {view.isOpenAppShown &&
        !view.appLink &&
        !view.isQrLoading &&
        !view.isQrFailed && (
          <button className={styles.openApp} onClick={view.openApp}>
            <Smartphone size={18} strokeWidth={1.7} />
            Open in authenticator app
          </button>
        )}
      <QrCode view={view} isQrTucked={isQrTucked} />
      <CodeField view={view} label="Enter the 6-digit code from the app" />
      {view.isVerified ? (
        <div
          className={joinClassNames(styles.primary, styles.verified)}
          role="status"
          aria-label={`${view.name} added`}
        >
          <Check size={22} strokeWidth={2.6} />
        </div>
      ) : (
        <BusyButton
          className={styles.primary}
          isBusy={view.isBusy}
          label={view.verifyLabel}
          onClick={view.verify}
        />
      )}
    </>
  );
};
