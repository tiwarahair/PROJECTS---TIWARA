import { TriangleAlert } from "lucide-react";
import { AUTH_FAILURE_MESSAGES } from "../../lib/auth-errors";
import type { AuthFailure } from "../../lib/auth-errors";
import styles from "../../styles/features/onboarding/auth-alert.module.css";

interface AuthAlertProps {
  failure: AuthFailure | null;
  onRetry: () => void;
}

/** Why the last call failed, above the step's main button; Try again only when it was the connection. */
export const AuthAlert = ({ failure, onRetry }: AuthAlertProps) => {
  if (!failure) return null;

  return (
    <div role="alert" className={styles.alert}>
      <TriangleAlert
        className={styles.icon}
        size={18}
        strokeWidth={1.8}
        aria-hidden="true"
      />
      <span className={styles.text}>{AUTH_FAILURE_MESSAGES[failure]}</span>
      {failure === "network" && (
        <button onClick={onRetry} className={styles.retry}>
          Try again
        </button>
      )}
    </div>
  );
};
