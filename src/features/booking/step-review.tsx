import { getWhenLine } from "./booking-calendar";
import { getWhereRow } from "./booking-details";
import fields from "./booking-fields.module.css";
import step from "./booking-step.module.css";
import styles from "./step-review.module.css";
import type { BookingController } from "./use-booking";

interface StepReviewProps {
  booking: BookingController;
}

interface SummaryRow {
  label: string;
  value: string | null;
  edit?: boolean;
  sub?: string;
}

/** Step 5 (Review your booking): summary rows, money, the policy card and the agreement line. */
export const StepReview = ({ booking }: StepReviewProps) => {
  const { state, stylist, service, options, money, address, actions } = booking;
  const { sel, alg, photos } = state;
  const { PL } = money;
  const allergyText = alg.on ? alg.text.trim() : "";
  const [whereValue, whereSub] = getWhereRow(stylist, address.clientAddress);
  const rows: SummaryRow[] = [
    { label: "Service", value: service ? service.name : null },
    { label: "Size", value: options.size.length ? sel.size : null },
    { label: "Length", value: options.length.length ? sel.length : null },
    { label: "Colour", value: options.colour ? sel.colour : null },
    ...options.own.map(({ name }) => ({
      label: name,
      value: sel.own[name] || null,
    })),
    {
      label: "Add-ons",
      value: sel.addons.length ? sel.addons.join(" · ") : null,
    },
    {
      label: "Inspiration photos",
      value: photos.length ? photos.length + " attached" : null,
    },
    {
      label: "Allergies or sensitivities",
      value: allergyText || null,
      edit: true,
    },
    { label: "Stylist", value: stylist.name },
    {
      label: "Date & time",
      value:
        state.date && state.time
          ? getWhenLine(state.calY, state.calM, state.date, state.time)
          : null,
    },
    { label: "Where", value: whereValue, edit: false, sub: whereSub },
  ];
  // Edit (allergies) jumps back to Your details with the field open
  const editAllergies = () =>
    actions.setState(
      (current) => ({
        step: 4,
        alg: { ...current.alg, prior: false, focus: true },
      }),
      actions.scrollToTitle,
    );

  return (
    <>
      <h1 className={step.title}>Review your booking</h1>
      <p className={step.lead}>
        {
          "Check everything, agree to the policies, and you're one step from done."
        }
      </p>
      <div className={styles.summary}>
        <div className={styles.eyebrow}>Booking summary</div>
        <div className={styles.rows}>
          {rows
            .filter(({ value }) => value)
            .map(({ label, value, edit, sub }) => (
              <div key={label} className={styles.row}>
                <span className={styles.rowLabel}>{label}</span>
                <span className={styles.rowValue}>
                  {value}
                  {edit && (
                    <>
                      {" "}
                      <button onClick={editAllergies} className={styles.edit}>
                        Edit
                      </button>
                    </>
                  )}
                  {!!sub && <span className={styles.rowSub}>{sub}</span>}
                </span>
              </div>
            ))}
        </div>
        <div className={styles.totals}>
          <div className={styles.totalRow}>
            <span className={styles.muted}>Service</span>
            <span>{money.service}</span>
          </div>
          <div className={styles.totalRow}>
            <span className={styles.muted}>Booking fee (50p + 1.5%)</span>
            <span>{money.fee}</span>
          </div>
          <div className={styles.grandTotal}>
            <span>Total</span>
            <span>{money.total}</span>
          </div>
        </div>
      </div>
      <div
        data-screen-label="Policy card"
        aria-live="polite"
        className={styles.policyCard}
      >
        <div className={styles.dueRow}>
          <span className={styles.dueLabelRow}>
            <span className={styles.accentLabel}>Due today</span>
            {PL.mode === "deposit" && (
              <span data-screen-label="Deposit tag" className={styles.tag}>
                {(stylist.policies.depositPct || 0) + "% deposit"}
              </span>
            )}
          </span>
          <span className={styles.dueAmount}>{money.dueToday}</span>
        </div>
        {PL.mode === "full" && (
          <div
            data-screen-label="Full payment notice"
            className={styles.fullNotice}
          >
            <span className={styles.fullTag}>Full payment</span>
            <span className={styles.pretty}>
              {stylist.name + " asks for the full price when you book."}
            </span>
          </div>
        )}
        <div className={styles.rule}></div>
        <div className={styles.lines}>
          {PL.lines.map(({ icon, text }) => (
            <div key={text} className={styles.line}>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={styles.lineIcon}
              >
                <path d={icon}></path>
              </svg>
              <span className={styles.lineText}>{text}</span>
            </div>
          ))}
        </div>
        {PL.notes.length > 0 && (
          <>
            <div className={styles.notesRule}></div>
            <div className={styles.accentLabel}>From your stylist</div>
            <div className={styles.notes}>
              {PL.notes.map((note) => (
                <div key={note} className={styles.note}>
                  {note}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
      {PL.cardSaved && !state.loggedIn && (
        <p data-screen-label="Agreement line" className={styles.agreement}>
          {"By booking, you agree to " +
            stylist.name +
            "'s cancellation policy and our "}
          <button
            onClick={() => actions.setState({ doc: "terms" })}
            className={fields.linkButton}
          >
            Terms
          </button>
          .
        </p>
      )}
    </>
  );
};
