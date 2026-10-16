import { Link } from "react-router";
import styles from "../../styles/components/page-message/page-message.module.css";

interface PageMessageProps {
  title: string;
  text: string;
  linkLabel: string;
  linkHref: string;
}

/** A centred page-level message with one way on ("We couldn't find this stylist" → Find a stylist). */
export const PageMessage = ({
  title,
  text,
  linkLabel,
  linkHref,
}: PageMessageProps) => (
  <div className={styles.message}>
    <h1 className={styles.title}>{title}</h1>
    <p className={styles.text}>{text}</p>
    <Link to={linkHref} className={styles.link}>
      {linkLabel}
    </Link>
  </div>
);
