import { joinClassNames } from "../../../utils/class-names";
import type { AccountController } from "../use-account";
import shared from "../../../styles/features/account/dialogs/index.module.css";
import styles from "../../../styles/features/account/dialogs/delete.module.css";

interface DeleteBlockedProps {
  account: AccountController;
  upcomingCount: number;
}

export const DeleteBlocked = ({
  account: { actions },
  upcomingCount,
}: DeleteBlockedProps) => (
  <div data-screen-label="Delete account blocked">
    <h2 className={shared.title} id="ac-dlg-t">
      Delete your account
    </h2>
    <p className={styles.deleteLead}>
      {
        "You can't delete your account while you have upcoming bookings or money owed."
      }
    </p>
    <p className={styles.deleteDetail}>
      {upcomingCount === 1
        ? "You have 1 upcoming booking. Cancel it or wait until it’s over, then try again."
        : `You have ${upcomingCount} upcoming bookings. Cancel them or wait until they’re over, then try again.`}
    </p>
    <div className={shared.actions}>
      <button
        className={styles.viewBookings}
        onClick={() => {
          actions.setState({ dialog: null });
          actions.goToSection("bookings");
        }}
      >
        View bookings
      </button>
      <button className={shared.secondary} onClick={actions.closeDialog}>
        Close
      </button>
    </div>
  </div>
);

interface DeleteAccountProps {
  account: AccountController;
}

export const DeleteAccount = ({
  account: { state, refs, actions },
}: DeleteAccountProps) => {
  const { deleteText } = state;
  const canDelete = deleteText.trim() === "DELETE";

  return (
    <div data-screen-label="Delete account allowed">
      <h2 className={shared.title} id="ac-dlg-t">
        Delete your account?
      </h2>
      <p className={styles.deleteLead}>This can’t be undone.</p>
      <div className={styles.deleteHeading}>We’ll delete</div>
      <ul className={styles.deleteList}>
        <li>Your name and contact details</li>
        <li>Your favourites</li>
        <li>Allergies you’ve shared with stylists</li>
        <li>Your saved cards</li>
      </ul>
      <div className={styles.keepHeading}>We’ll keep, anonymised</div>
      <p className={styles.keepText}>
        Payment records, because we have to keep them for tax and refunds. Your
        name won’t be attached.
      </p>
      <label className={styles.deleteLabel}>
        Type DELETE to confirm{" "}
        <input
          className={styles.deleteInput}
          ref={refs.deleteConfirm}
          value={deleteText}
          onChange={(event) =>
            actions.setState({ deleteText: event.target.value.toUpperCase() })
          }
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck="false"
        />
      </label>
      <div className={shared.actions}>
        <button className={shared.secondary} onClick={actions.closeDialog}>
          Cancel
        </button>
        <button
          className={joinClassNames(
            styles.deleteButton,
            canDelete ? styles.deleteReady : styles.deleteBlocked,
          )}
          onClick={() => {
            if (!canDelete) return;

            actions.setState({ dialog: null, deleted: true });
            actions.endSession();
            actions.showToast("Your account has been deleted");
          }}
          disabled={!canDelete}
        >
          Delete account
        </button>
      </div>
    </div>
  );
};
