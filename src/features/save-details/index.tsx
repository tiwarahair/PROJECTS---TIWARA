import { useLayoutEffect, useState } from "react";
import { Link } from "react-router";
import { PageMessage } from "../../components/page-message/page-message";
import { usePrivateLink } from "../../hooks/use-private-link";
import {
  getErrorMessage,
  useGetBookingInviteQuery,
} from "../../stores/api-slice";
import { getAssetUrl } from "../../utils/asset-url";
import { SaveDetailsForm } from "./form";
import type { SaveOutcome } from "./form";
import { AccountExistsMessage, ExpiredMessage, SavedMessage } from "./messages";
import "../../styles/features/save-details/global.module.css";
import styles from "../../styles/features/save-details/index.module.css";

const getStateOutcome = (state: string): SaveOutcome | null => {
  if (state === "expired") return "expired";

  return state === "valid" ? null : "exists";
};

/** Route "/save-details?token=": a guest sets a password and their bookings move into the new account. */
export const SaveDetailsPage = () => {
  const token = usePrivateLink("tw_invite_token");
  const [outcome, setOutcome] = useState<SaveOutcome | null>(null);

  const {
    currentData: invite,
    isFetching,
    error,
  } = useGetBookingInviteQuery(token, { skip: !token });

  useLayoutEffect(() => {
    document.documentElement.classList.add("save-details-page");

    return () => document.documentElement.classList.remove("save-details-page");
  }, []);

  const getContent = () => {
    if (isFetching) return null;

    if (!invite) {
      const isInvalid = !token || getErrorMessage(error) === "link_not_valid";

      return (
        <PageMessage
          title={
            isInvalid ? "This link isn’t valid" : "We couldn’t load this page"
          }
          text={
            isInvalid
              ? "Use the link in your latest booking email."
              : "Check your connection and try again."
          }
          linkLabel="Go to Tiwára’s House"
          linkHref="/"
        />
      );
    }

    const shown = outcome ?? getStateOutcome(invite.state);

    if (shown === "done") return <SavedMessage email={invite.email} />;

    if (shown === "exists")
      return <AccountExistsMessage email={invite.email} />;

    if (shown === "expired")
      return <ExpiredMessage token={token} email={invite.email} />;

    return (
      <SaveDetailsForm token={token} invite={invite} onDone={setOutcome} />
    );
  };

  return (
    <div data-screen-label="Save details" className={styles.page}>
      <nav className={styles.nav}>
        <div className={styles.bar}>
          <Link to="/" className={styles.logoLink}>
            <img
              src={getAssetUrl("logos/logo-crimson-sm.png")}
              alt="Tiwára's House"
              className={styles.logo}
            />
          </Link>
        </div>
      </nav>
      <main className={styles.main} aria-busy={isFetching}>
        {getContent()}
      </main>
    </div>
  );
};
