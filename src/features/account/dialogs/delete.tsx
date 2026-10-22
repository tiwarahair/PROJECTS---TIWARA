import { skipToken } from "@reduxjs/toolkit/query";
import { Link } from "react-router";
import { isDeletionBlocked } from "../../../lib/client-account";
import type { DeletionBlockers } from "../../../lib/client-account";
import { useGetDeletionBlockersQuery } from "../../../stores/account-api";
import { useAppSelector } from "../../../stores/hooks";
import { formatAccountDate } from "../logic";
import { DeleteAccount } from "./delete-account";
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

  return <DeleteAccount account={account} onBlocked={() => void refetch()} />;
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
