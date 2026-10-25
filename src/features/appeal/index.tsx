import { Calendar } from "lucide-react";
import { useLayoutEffect, useState } from "react";
import { Link } from "react-router";
import { Button } from "../../components/ds/button";
import { PageMessage } from "../../components/page-message";
import { ManageBookingSkeleton } from "../../components/skeleton/manage-booking-skeleton";
import { useIsSlow } from "../../hooks/use-is-slow";
import { usePrivateLink } from "../../hooks/use-private-link";
import {
  getErrorMessage,
  useGetAppealPageQuery,
  useSubmitAppealMutation,
} from "../../stores/api-slice";
import { getAssetUrl } from "../../utils/asset-url";
import { joinClassNames } from "../../utils/class-names";
import { formatWhen } from "../pay-fee/logic";
import {
  APPEAL_ERRORS,
  getClosedMessage,
  MAX_APPEAL_LENGTH,
  OUTCOME_TEXT,
} from "./logic";
import "../../styles/features/manage-booking/global.module.css";
import frame from "../../styles/features/manage-booking/index.module.css";
import styles from "../../styles/features/review/index.module.css";

/** The reviewer's appeal against a decision on their review, route "/appeal?token=" from the decision email. */
export const AppealPage = () => {
  const token = usePrivateLink({ storageKey: "tw_appeal_token" });
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [submit, { isLoading: isSubmitting }] = useSubmitAppealMutation();

  const {
    currentData: page,
    isFetching,
    error: loadError,
  } = useGetAppealPageQuery(token, { skip: !token });

  const isSlow = useIsSlow(isFetching && !page);

  useLayoutEffect(() => {
    document.documentElement.classList.add("manage-page");

    return () => document.documentElement.classList.remove("manage-page");
  }, []);

  const send = async () => {
    if (!body.trim()) {
      setError("Tell us why you think we should look again.");

      return;
    }

    setError("");

    await submit({ token, body })
      .unwrap()
      .catch((failure: unknown) =>
        setError(
          APPEAL_ERRORS[getErrorMessage(failure)] ??
            "We couldn’t send your appeal. Try again.",
        ),
      );
  };

  const getContent = () => {
    if (isSlow) return <ManageBookingSkeleton />;

    if (isFetching && !page) return null;

    if (!page || page.state !== "open")
      return (
        <PageMessage {...getClosedMessage(page, getErrorMessage(loadError))} />
      );

    return (
      <>
        <div className={frame.eyebrow}>Appeal</div>
        <h1 className={frame.title}>Ask us to look again</h1>
        <div className={styles.visit}>
          <div className={styles.visitText}>
            <div className={styles.visitService}>{page.service_name}</div>
            <div className={styles.visitStylist}>
              {`with ${page.stylist_name}`}
            </div>
            <div className={styles.visitWhen}>
              <Calendar size={14} strokeWidth={1.6} />
              {formatWhen(page.starts_at)}
            </div>
          </div>
        </div>
        {!!page.outcome && (
          <p className={styles.note}>{OUTCOME_TEXT[page.outcome]}</p>
        )}
        <form
          className={styles.form}
          onSubmit={(event) => {
            event.preventDefault();
            void send();
          }}
        >
          <label className={styles.field}>
            <span className={styles.fieldHead}>
              <span className={styles.legend}>Why should we look again?</span>
              <span className={styles.count}>
                {`${body.length}/${MAX_APPEAL_LENGTH}`}
              </span>
            </span>
            <textarea
              className={styles.textarea}
              value={body}
              maxLength={MAX_APPEAL_LENGTH}
              rows={5}
              onChange={(event) => {
                setBody(event.target.value);
                setError("");
              }}
            />
          </label>
          {!!error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}
          <Button
            type="submit"
            size="lg"
            disabled={isSubmitting}
            className={styles.submit}
          >
            {isSubmitting ? "Sending…" : "Send appeal"}
          </Button>
        </form>
        <p className={styles.note}>
          You can appeal once. Someone who didn’t make the first decision will
          look again where possible, and their answer is final.
        </p>
      </>
    );
  };

  return (
    <div data-screen-label="Appeal" className={frame.page}>
      <nav className={frame.nav}>
        <div className={frame.bar}>
          <Link to="/" className={frame.logoLink}>
            <img
              src={getAssetUrl("logos/logo-crimson-sm.png")}
              alt="Tiwára's House"
              className={frame.logo}
            />
          </Link>
        </div>
      </nav>
      <main
        className={joinClassNames(frame.main, styles.main)}
        aria-busy={isFetching}
      >
        {getContent()}
      </main>
    </div>
  );
};
