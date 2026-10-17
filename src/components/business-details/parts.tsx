import type { ReactNode } from "react";
import { CircleAlert } from "lucide-react";
import { joinClassNames } from "../../utils/class-names";
import styles from "../../styles/components/business-details/parts.module.css";

/** Section with the heading column on the left (wraps above on narrow containers). */
export const Section = ({
  id,
  label,
  heading,
  intro,
  children,
}: {
  id: string;
  label: string;
  heading: string;
  intro?: string;
  children: ReactNode;
}) => (
  <section className={styles.section} data-sec={id} data-screen-label={label}>
    <div className={styles.intro}>
      <h2 className={styles.heading}>{heading}</h2>
      {intro !== undefined && <p className={styles.introText}>{intro}</p>}
    </div>
    {children}
  </section>
);

/** Grid-rows disclosure. */
export const Reveal = ({
  open,
  children,
}: {
  open: boolean;
  children: ReactNode;
}) => (
  <div
    className={joinClassNames(
      styles.reveal,
      open ? styles.revealOpen : styles.revealClosed,
    )}
    data-bd-anim="1"
    aria-hidden={open ? "false" : "true"}
  >
    <div className={styles.revealInner}>{children}</div>
  </div>
);

export const FieldError = ({ id, error }: { id: string; error: string }) =>
  error ? (
    <div className={styles.error} id={id} role="alert">
      <CircleAlert className={styles.errorIcon} size={15} strokeWidth={1.8} />
      {error}
    </div>
  ) : null;
