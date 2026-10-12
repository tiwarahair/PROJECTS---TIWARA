import styles from "../../styles/features/manage-booking/remove-dialog.module.css";

interface RemoveDialogProps {
  text: string;
  onCancel: () => void;
  onRemove: () => void;
}

/** "Remove this?" confirm; the scrim cancels. */
export const RemoveDialog = ({
  text,
  onCancel,
  onRemove,
}: RemoveDialogProps) => (
  // the scrim cancels on click; the panel stops the click
  // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
  <div onClick={onCancel} data-mb-anim="1" className={styles.scrim}>
    {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions */}
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="mb-cf-t"
      onClick={(event) => event.stopPropagation()}
      data-mb-anim="1"
      className={styles.panel}
    >
      <h3 id="mb-cf-t" className={styles.title}>
        Remove this?
      </h3>
      <p className={styles.text}>{text}</p>
      <div className={styles.actions}>
        <button onClick={onCancel} className={styles.cancel}>
          Cancel
        </button>
        <button onClick={onRemove} className={styles.remove}>
          Remove
        </button>
      </div>
    </div>
  </div>
);
