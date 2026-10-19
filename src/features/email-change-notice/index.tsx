import { useLayoutEffect } from "react";
import { Link } from "react-router";
import { getAssetUrl } from "../../utils/asset-url";
import { SUPPORT_EMAIL } from "../../utils/support";
import "../../styles/features/email-change-notice/index-global.module.css";
import styles from "../../styles/features/email-change-notice/index.module.css";

/**
 * Mock of the email sent to the old address after an email change, route "/email/email-change-notice".
 * Static copy.
 */
export const EmailChangeNoticePage = () => {
  useLayoutEffect(() => {
    document.documentElement.classList.add("email-notice-page");

    return () => document.documentElement.classList.remove("email-notice-page");
  }, []);

  return (
    <div
      className={styles.page}
      data-screen-label="Email to old address: email changed"
    >
      <div className={styles.column}>
        <div className={styles.meta}>
          <div>
            <strong className={styles.metaLabel}>From:</strong>
            {` Tiwára's House <${SUPPORT_EMAIL}>`}
          </div>
          <div>
            <strong className={styles.metaLabel}>To:</strong>
            {" nia.okafor@gmail.com"}
          </div>
          <div>
            <strong className={styles.metaLabel}>Subject:</strong>
            {" Your email was changed"}
          </div>
        </div>
        <div className={styles.card}>
          <img
            className={styles.logo}
            src={getAssetUrl("logos/logo-crimson-sm.png")}
            alt="Tiwára's House"
          />
          <h1 className={styles.title}>Your email was changed</h1>
          <p className={styles.greeting}>Hi Nia,</p>
          <p className={styles.body}>
            {
              "Your Tiwára's House email was changed from nia.okafor@gmail.com to nia.okafor@outlook.com. If this wasn't you, contact us."
            }
          </p>
          <Link className={styles.cta} to="/help">
            {"This wasn't me"}
          </Link>
          <p className={styles.footnote}>
            {
              "You're getting this because it's the email that was on your Tiwára's House account."
            }
          </p>
        </div>
      </div>
    </div>
  );
};
