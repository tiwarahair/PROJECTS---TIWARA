import { Calendar } from "lucide-react";
import { useLayoutEffect, useState } from "react";
import { Link } from "react-router";
import { Button } from "../../components/ds/button";
import { PageMessage } from "../../components/page-message";
import { ManageBookingSkeleton } from "../../components/skeleton/manage-booking";
import { StarPicker } from "../../components/star-rating/star-picker";
import { useIsSlow } from "../../hooks/use-is-slow";
import { usePrivateLink } from "../../hooks/use-private-link";
import {
  getErrorMessage,
  useGetReviewPageQuery,
  useSubmitReviewMutation,
} from "../../stores/api-slice";
import { getAssetUrl } from "../../utils/asset-url";
import { joinClassNames } from "../../utils/class-names";
import { formatWhen } from "../pay-fee/logic";
import { getClosedMessage, MAX_REVIEW_LENGTH, REVIEW_ERRORS } from "./logic";
import "../../styles/features/manage-booking/global.module.css";
import frame from "../../styles/features/manage-booking/index.module.css";
import styles from "../../styles/features/review/index.module.css";

/** The client's review of a completed booking, route "/review?token=" from the invite email. */
export const ReviewPage = () => {
  const token = usePrivateLink({ storageKey: "tw_review_token" });
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [submit, { isLoading: isSubmitting }] = useSubmitReviewMutation();

  const {
    currentData: page,
    isFetching,
    error: loadError,
  } = useGetReviewPageQuery(token, { skip: !token });

  const isSlow = useIsSlow(isFetching && !page);

  useLayoutEffect(() => {
    document.documentElement.classList.add("manage-page");

    return () => document.documentElement.classList.remove("manage-page");
  }, []);

  const send = async () => {
    if (!rating) {
      setError("Choose a star rating.");

      return;
    }

    setError("");

    await submit({ token, rating, body })
      .unwrap()
      .catch((failure: unknown) =>
        setError(
          REVIEW_ERRORS[getErrorMessage(failure)] ??
            "We couldn’t post your review. Try again.",
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
        <div className={frame.eyebrow}>Your review</div>
        <h1 className={frame.title}>
          {`How was your visit to ${page.stylist_name}?`}
        </h1>
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
        <form
          className={styles.form}
          onSubmit={(event) => {
            event.preventDefault();
            void send();
          }}
        >
          <fieldset className={styles.fieldset}>
            <legend className={styles.legend}>Your rating</legend>
            <StarPicker
              value={rating}
              onChange={(stars) => {
                setRating(stars);
                setError("");
              }}
            />
          </fieldset>
          <label className={styles.field}>
            <span className={styles.fieldHead}>
              <span className={styles.legend}>
                Tell others about your visit{" "}
                <span className={styles.optional}>(optional)</span>
              </span>
              <span className={styles.count}>
                {`${body.length}/${MAX_REVIEW_LENGTH}`}
              </span>
            </span>
            <textarea
              className={styles.textarea}
              value={body}
              maxLength={MAX_REVIEW_LENGTH}
              rows={5}
              placeholder="What did you have done, and how did it go?"
              onChange={(event) => setBody(event.target.value)}
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
            {isSubmitting ? "Posting…" : "Post review"}
          </Button>
        </form>
        <p className={styles.note}>
          {`Your review is public, shown as your first name and last initial with “Verified booking”. It can’t be changed once posted. Please don’t include phone numbers, emails or anything private.`}
        </p>
      </>
    );
  };

  return (
    <div data-screen-label="Review" className={frame.page}>
      <nav className={frame.nav}>
        <div className={frame.bar}>
          <Link to="/" className={frame.logoLink}>
            <img
              src={getAssetUrl("logos/logo-crimson-sm.png")}
              alt="Tiwára's House"
              className={frame.logo}
            />
          </Link>
          {!!page && (
            <span className={frame.who}>{`Booking ref ${page.ref}`}</span>
          )}
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
