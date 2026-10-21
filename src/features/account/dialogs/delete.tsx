import { skipToken } from "@reduxjs/toolkit/query";
import { useState } from "react";
import { Link } from "react-router";
import {
  deleteClientAccount,
  isDeletionBlocked,
} from "../../../lib/client-account";
import type { DeletionBlockers } from "../../../lib/client-account";
import { getErrorMessage } from "../../../stores/api-slice";
import { useGetDeletionBlockersQuery } from "../../../stores/account-api";
import { clearStoredFavourites } from "../../../stores/favourites-slice";
import { useAppSelector } from "../../../stores/hooks";
import { joinClassNames } from "../../../utils/class-names";
import { writeDeviceAddresses } from "../../../utils/saved-addresses";
import { formatAccountDate } from "../logic";
import type { AccountController } from "../use-account";
import shared from "../../../styles/features/account/dialogs/index.module.css";
import styles from "../../../styles/features/account/dialogs/delete.module.css";
import ui from "../../../styles/features/account/ui.module.css";

interface DeleteDialogProps {
  account: AccountController;
}

export const DeleteDialog = ({ account }: DeleteDialogProps) => {
  const userId = useAppSelector(({ session }) => session.user?.id);

  const { data: blockers, refetch } = useGetDeletionBlockersQuery(
    userId ?? skipToken,
    { refetchOnMountOrArgChange: true },
  );

  if (!blockers)
    return (
      <div data-screen-label="Delete account checking">
        <h2 className={shared.title} id="ac-dlg-t">
          Delete your account
        </h2>
        <p className={styles.deleteDetail}>Checking your account…</p>
      </div>
    );

  if (isDeletionBlocked(blockers))
    return <DeleteBlocked account={account} blockers={blockers} />;

  return (
    <DeleteAccount
      account={account}
      userId={userId ?? ""}
      onBlocked={() => void refetch()}
    />
  );
};

interface DeleteBlockedProps {
  account: AccountController;
  blockers: DeletionBlockers;
}

const DeleteBlocked = ({
  account: { actions },
  blockers: { bookings, owesMoney, hasBusiness },
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
    {bookings.length > 0 && (
      <ul className={styles.deleteList}>
        {bookings.map(({ ref, stylistName, startsAt }) => (
          <li key={ref}>
            {`${stylistName}, ${formatAccountDate(Date.parse(startsAt), true)} · `}
            <Link
              className={ui.quietButton}
              to={`/manage?ref=${ref}`}
              onClick={actions.closeDialog}
            >
              Manage booking
            </Link>
          </li>
        ))}
      </ul>
    )}
    {bookings.length > 0 && (
      <p className={styles.deleteDetail}>
        Cancel them or wait until they’re over, then try again.
      </p>
    )}
    {owesMoney && (
      <p className={styles.deleteDetail}>
        You have a fee or balance to pay. Pay it from the link in your email,
        then try again.
      </p>
    )}
    {hasBusiness && (
      <p className={styles.deleteDetail}>
        Your login also runs a business on Tiwára’s House. Contact support to
        close both.
      </p>
    )}
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
  userId: string;
  onBlocked: () => void;
}

const DeleteAccount = ({
  account: { state, refs, actions },
  userId,
  onBlocked,
}: DeleteAccountProps) => {
  const { deleteText } = state;
  const [isDeleting, setDeleting] = useState(false);
  const canDelete = deleteText.trim() === "DELETE" && !isDeleting;

  const deleteAccount = async () => {
    setDeleting(true);

    try {
      await deleteClientAccount();
    } catch (error) {
      setDeleting(false);

      if (getErrorMessage(error) === "blocked") return onBlocked();

      return actions.showToast("Your account couldn’t be deleted. Try again");
    }

    clearStoredFavourites(userId);
    writeDeviceAddresses([]);
    actions.setState({ dialog: null, deleted: true });
    actions.endSession();
    actions.showToast("Your account has been deleted");
  };

  return (
    <div data-screen-label="Delete account allowed">
      <h2 className={shared.title} id="ac-dlg-t">
        Delete your account?
      </h2>
      <p className={styles.deleteLead}>This can’t be undone.</p>
      <div className={styles.deleteHeading}>We’ll delete</div>
      <ul className={styles.deleteList}>
        <li>Your name and contact details</li>
        <li>Your favourites and saved addresses</li>
        <li>Allergies and notes you’ve shared with stylists</li>
        <li>Your saved cards</li>
      </ul>
      <div className={styles.keepHeading}>We’ll keep, without your details</div>
      <p className={styles.keepText}>
        Payment records, for tax. Recent payments keep your name and email for
        up to 120 days in case one is disputed.
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
            if (canDelete) void deleteAccount();
          }}
          disabled={!canDelete}
        >
          {isDeleting ? "Deleting…" : "Delete account"}
        </button>
      </div>
    </div>
  );
};
