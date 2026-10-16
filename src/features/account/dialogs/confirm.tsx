import shared from "../../../styles/features/account/dialogs/index.module.css";
import styles from "../../../styles/features/account/dialogs/confirm.module.css";

interface ConfirmProps {
  title: string;
  text: string;
  action: string;
  onConfirm: () => void;
  onCancel: () => void;
  cancel?: string;
}

export const Confirm = ({
  title,
  text,
  action,
  onConfirm,
  onCancel,
  cancel = "Cancel",
}: ConfirmProps) => (
  <>
    <h2 className={shared.title} id="ac-dlg-t">
      {title}
    </h2>
    <p className={styles.text}>{text}</p>
    <div className={shared.actions}>
      <button className={shared.secondary} onClick={onCancel}>
        {cancel}
      </button>
      <button className={styles.primary} onClick={onConfirm}>
        {action}
      </button>
    </div>
  </>
);
