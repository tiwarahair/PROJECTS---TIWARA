import type { AddBookingView } from "./view";
import styles from "../../../../styles/features/studio/bookings/add/notes-step.module.css";
import shared from "../../../../styles/features/studio/bookings/add/index.module.css";

interface NotesStepProps {
  view: AddBookingView;
}

/** Step 5: address and a private note. */
export const NotesStep = ({ view }: NotesStepProps) => (
  <>
    <div className={shared.question}>Anything else?</div>
    <div className={styles.stack12}>
      {view.isAddressAsked && (
        <label className={shared.block}>
          <span className={shared.fieldLabel}>
            Client address <span className={shared.optional}>(optional)</span>
          </span>
          <input
            className={shared.input}
            value={view.addressValue}
            onChange={view.onAddress}
            placeholder="Street, postcode"
          />
        </label>
      )}
      <label className={shared.block}>
        <span className={shared.fieldLabel}>
          Note{" "}
          <span className={shared.optional}>(optional, only you see this)</span>
        </span>
        <textarea
          className={styles.textarea}
          value={view.note}
          onChange={view.onNote}
          rows={2}
          placeholder="e.g. Wants colour 30, bring extra packs"
        ></textarea>
      </label>
    </div>
    <div className={shared.summary}>{view.summary}</div>
    {!!view.noEmailNote && (
      <div className={styles.hint}>{view.noEmailNote}</div>
    )}
  </>
);
