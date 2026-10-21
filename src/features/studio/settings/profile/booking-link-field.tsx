import { useEffect, useState } from "react";
import { changeSlug, isSlugFree } from "../../../../lib/studio-api/settings";
import { joinClassNames } from "../../../../utils/class-names";
import { SHORT_MONTHS } from "../../../../utils/dates";
import type { StudioController } from "../../core/use-studio";
import pages from "../../../../styles/features/studio/settings/page-parts.module.css";
import styles from "../../../../styles/features/studio/settings/profile/booking-link-field.module.css";

const DAYS_BETWEEN_CHANGES = 30;
const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

type Status = "same" | "checking" | "available" | "taken" | "invalid";

const STATUS_TEXT: Record<Status, string> = {
  same: "",
  checking: "Checking…",
  available: "Available",
  taken: "That link is taken",
  invalid: "Use 3–40 lowercase letters, numbers and single hyphens",
};

const getNextChange = (changedAt: string | null) => {
  if (!changedAt) return null;

  const next = new Date(changedAt);

  next.setDate(next.getDate() + DAYS_BETWEEN_CHANGES);

  return next > new Date() ? next : null;
};

/** Settings → Profile: the stylist's booking link, changed by the page's Save at most once every 30 days. */
export const BookingLinkField = ({ studio }: { studio: StudioController }) => {
  const { state, setState, actions, context } = studio;
  const { account } = state;
  const [value, setValue] = useState(account.slug);
  const [status, setStatus] = useState<Status>("same");
  const nextChange = getNextChange(account.slugChangedAt);

  useEffect(() => {
    context.memo.isSlugEdited = value !== account.slug;

    if (value === account.slug) return setStatus("same");

    if (!SLUG_PATTERN.test(value) || value.length < 3 || value.length > 40)
      return setStatus("invalid");

    setStatus("checking");

    // a reply for a value that has since changed is ignored
    let isCurrent = true;

    const timer = window.setTimeout(() => {
      isSlugFree(value, account.stylistId)
        .then(
          (isFree) => isCurrent && setStatus(isFree ? "available" : "taken"),
        )
        .catch(() => isCurrent && setStatus("same"));
    }, 400);

    return () => {
      isCurrent = false;
      window.clearTimeout(timer);
    };
  }, [value, account, context.memo]);

  // the page's Save calls this first and stops when it returns false
  useEffect(() => {
    context.memo.saveSlug = async () => {
      if (status === "same") return true;

      if (status !== "available") {
        actions.showToast("Choose an available booking link first.");

        return false;
      }

      try {
        const slug = (await changeSlug(value)) ?? value;

        setState({
          account: {
            ...account,
            slug,
            slugChangedAt: new Date().toISOString(),
          },
        });

        setStatus("same");

        return true;
      } catch {
        actions.showToast("That link couldn’t be saved. Try another.");

        return false;
      }
    };

    return () => {
      context.memo.saveSlug = undefined;
    };
  }, [context, account, status, value, actions, setState]);

  return (
    <div className={pages.field}>
      <label className={pages.fieldLabel} htmlFor="booking-link">
        Booking link
      </label>
      <div className={styles.inputGroup}>
        <span className={styles.prefix}>tiwarashouse.com/</span>
        <input
          id="booking-link"
          className={styles.input}
          value={value}
          disabled={!!nextChange}
          onChange={(event) =>
            setValue(event.target.value.toLowerCase().replace(/\s+/g, "-"))
          }
          aria-describedby="booking-link-status booking-link-hint"
          autoCapitalize="none"
          spellCheck={false}
        />
      </div>
      <div
        id="booking-link-status"
        role="status"
        className={joinClassNames(
          styles.status,
          status === "available" && styles.available,
          (status === "taken" || status === "invalid") && styles.taken,
        )}
      >
        {STATUS_TEXT[status]}
      </div>
      <div id="booking-link-hint" className={pages.hint}>
        {nextChange
          ? `You can change this again on ${nextChange.getDate()} ${SHORT_MONTHS[nextChange.getMonth()]}. Old links keep working.`
          : "You can change this once every 30 days. Old links keep working."}
      </div>
    </div>
  );
};
