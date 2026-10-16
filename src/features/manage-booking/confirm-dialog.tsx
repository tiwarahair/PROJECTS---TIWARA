import styles from "../../styles/features/manage-booking/confirm-dialog.module.css";

interface ConfirmDialogProps {
  title: string;
  lines: string[];
  cancelLabel: string;
  confirmLabel: string;
  isBusy?: boolean;
  error?: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export const ConfirmDialog = ({
  title,
  lines,
  cancelLabel,
  confirmLabel,
  isBusy = false,
  error = "",
  onCancel,
  onConfirm,
}: ConfirmDialogProps) => (
  // eslint-disable-next-line jsx-a11y/click-events-have-key-events
  <div
    onClick={isBusy ? undefined : onCancel}
    data-mb-anim="1"
    className={styles.scrim}
  >
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
        {title}
      </h3>
      {lines.map((line) => (
        <p key={line} className={styles.text}>
          {line}
        </p>
      ))}
      {!!error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      <div className={styles.actions}>
        <button
          onClick={onCancel}
          disabled={isBusy}
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus
          className={styles.cancel}
        >
          {cancelLabel}
        </button>
        <button
          onClick={onConfirm}
          disabled={isBusy}
          className={styles.confirm}
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  </div>
);
