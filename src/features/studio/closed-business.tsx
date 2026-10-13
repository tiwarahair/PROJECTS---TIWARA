import { useNavigate } from "react-router";
import { Button } from "../../components/ds/button";
import { SiteHeader } from "../../components/site-header/site-header";
import { useSetBusinessClosedMutation } from "../../stores/api-slice";
import { SHORT_MONTHS } from "../../utils/dates";
import styles from "../../styles/features/studio/closed-business.module.css";

const REOPEN_DAYS = 15;

export interface ClosedBusinessProps {
  closedAt: string;
}

/** Studio for a closed business: reopen within 15 days, or carry on as a client. */
export const ClosedBusiness = ({ closedAt }: ClosedBusinessProps) => {
  const navigate = useNavigate();

  const [setBusinessClosed, { isLoading, isError }] =
    useSetBusinessClosedMutation();

  const lastDay = new Date(closedAt);

  lastDay.setDate(lastDay.getDate() + REOPEN_DAYS);

  return (
    <div className={styles.page}>
      <SiteHeader />
      <main className={styles.main}>
        <div className={styles.card}>
          <h1 className={styles.title}>Your business is closed</h1>
          <p className={styles.text}>
            Your booking page is offline. Reopen it to pick up where you left
            off; after that your business details and photos are deleted.
          </p>
          <div className={styles.deadline}>
            {`Reopen by ${lastDay.getDate()} ${SHORT_MONTHS[lastDay.getMonth()]}`}
          </div>
          {isError && (
            <p className={styles.error} role="alert">
              That didn’t work. Try again.
            </p>
          )}
          <div className={styles.actions}>
            <Button
              disabled={isLoading}
              onClick={() => void setBusinessClosed(false)}
            >
              Reopen business
            </Button>
            <Button variant="outline" onClick={() => navigate("/account")}>
              Go to your account
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};
