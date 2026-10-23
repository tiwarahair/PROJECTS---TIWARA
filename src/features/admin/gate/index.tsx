import { ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router";
import { PageMessage } from "../../../components/page-message";
import { PHONE_QUERY } from "../../../components/sheet";
import { useMediaQuery } from "../../../hooks/use-media-query";
import { getAssetUrl } from "../../../utils/asset-url";
import { BusyButton, CodeField } from "../../studio/settings/two-factor/fields";
import { StepApp } from "../../studio/settings/two-factor/step-app";
import { useGate } from "./use-gate";
import twoFactor from "../../../styles/features/studio/settings/two-factor/index.module.css";
import styles from "../../../styles/features/admin/gate.module.css";

interface TwoStepGateProps {
  isStylist: boolean;
  children: ReactNode;
}

/** Admin opens only after a two-step code this session */
export const TwoStepGate = ({ isStylist, children }: TwoStepGateProps) => {
  const isPhone = useMediaQuery(PHONE_QUERY);
  const { step, appView, verifyCode } = useGate(isPhone);

  if (step === "passed") return children;

  if (step === "checking") return null;

  if (step === "failed")
    return (
      <PageMessage
        title="Admin didn’t load"
        text="Check your connection, then try again."
        linkLabel="Try again"
        linkHref="/admin"
        isReload
      />
    );

  const isSetup = step === "setup";

  return (
    <div className={styles.page} data-screen-label="Admin: two-step">
      <Link className={styles.logoLink} to="/" aria-label="Tiwára's House home">
        <img
          className={styles.logo}
          src={getAssetUrl("logos/logo-crimson-sm.png")}
          alt=""
        />
      </Link>
      <main className={styles.card}>
        <span className={styles.icon} aria-hidden="true">
          <ShieldCheck size={22} strokeWidth={1.7} />
        </span>
        <h1 className={twoFactor.title}>
          {isSetup
            ? "Turn on two-step verification to use Admin"
            : "Enter your code to use Admin"}
        </h1>
        <p className={twoFactor.sub}>
          {isSetup
            ? "Admin can remove reviews and suspend stylists, so we ask for a code from your authenticator app each time you log in."
            : "Enter the 6-digit code from your authenticator app."}
        </p>
        <div className={styles.step}>
          {isSetup ? (
            <StepApp view={appView} isQrTucked={isPhone} />
          ) : (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                verifyCode();
              }}
            >
              <CodeField view={appView} label="6-digit code" />
              <BusyButton
                className={twoFactor.primary}
                isBusy={appView.isBusy}
                label="Continue"
                // the form's submit runs the check, so Enter works too
                onClick={() => undefined}
              />
            </form>
          )}
        </div>
        <Link className={styles.back} to={isStylist ? "/studio" : "/"}>
          {isStylist ? "Back to Studio" : "Not now"}
        </Link>
      </main>
    </div>
  );
};
