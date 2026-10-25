import { X } from "lucide-react";
import { ConfirmDialog } from "../../../components/confirm-dialog";
import { DISCARD_PROMPT } from "../../../hooks/use-unsaved-changes";
import { joinClassNames } from "../../../utils/class-names";
import type { AccountController } from "../use-account";
import type { AccountView } from "../view";
import { AddCardDialog } from "./add-card";
import {
  AddressRemove,
  AllergyRemove,
  CardRemove,
  LogoutAll,
  SyncReset,
} from "./confirms";
import { CookieSettings } from "./cookies";
import { DeleteAccount, DeleteBlocked } from "./delete";
import { ReceiptDialog } from "./receipt";
import styles from "../../../styles/features/account/dialogs/index.module.css";
import pageGlobal from "../../../styles/features/account/index-global.module.css";

const WIDE_DIALOGS = ["receipt", "delete", "cookies"];

interface AccountDialogsProps {
  account: AccountController;
  view: AccountView;
}

const getContent = (account: AccountController, view: AccountView) => {
  const { dialog } = account.state;

  if (!dialog) return null;

  if (dialog.kind === "receipt")
    return <ReceiptDialog account={account} view={view} />;

  if (dialog.kind === "allergy")
    return <AllergyRemove account={account} view={view} index={dialog.index} />;

  if (dialog.kind === "card")
    return <CardRemove account={account} id={dialog.id} />;

  if (dialog.kind === "addCard") return <AddCardDialog account={account} />;

  if (dialog.kind === "logoutAll") return <LogoutAll account={account} />;

  if (dialog.kind === "address")
    return <AddressRemove account={account} id={dialog.id} />;

  if (dialog.kind === "sync") return <SyncReset account={account} />;

  if (dialog.kind === "cookies") return <CookieSettings account={account} />;

  if (view.blocked)
    return (
      <DeleteBlocked account={account} upcomingCount={view.upcoming.length} />
    );

  return <DeleteAccount account={account} />;
};

/** Overlay + dialog for receipts, confirmations, add card, cookie settings and delete account. */
export const AccountDialogs = ({ account, view }: AccountDialogsProps) => {
  const { state, refs, actions } = account;
  const { dialog } = state;

  if (!dialog) return null;

  if (dialog.kind === "discard")
    return (
      <ConfirmDialog
        title={DISCARD_PROMPT.title}
        body={DISCARD_PROMPT.body}
        yesLabel={DISCARD_PROMPT.discard}
        noLabel={DISCARD_PROMPT.keep}
        onYes={dialog.then}
        onNo={actions.closeDialog}
      />
    );

  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
    <div
      className={joinClassNames(pageGlobal.acOv, styles.overlay)}
      onClick={actions.closeDialog}
      data-a="1"
    >
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions */}
      <div
        className={joinClassNames(
          pageGlobal.acDlg,
          styles.dialog,
          WIDE_DIALOGS.includes(dialog.kind)
            ? styles.dialogWide
            : styles.dialogNarrow,
        )}
        ref={refs.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ac-dlg-t"
        onClick={(event) => event.stopPropagation()}
        data-a="1"
      >
        <button
          className={styles.closeIcon}
          onClick={actions.closeDialog}
          aria-label="Close"
        >
          <X size={20} strokeWidth={2} />
        </button>
        {getContent(account, view)}
      </div>
    </div>
  );
};
