import { Link } from "react-router";
import styles from "../../styles/components/page-message/index.module.css";

interface PageMessageProps {
  title: string;
  text: string;
  linkLabel: string;
  linkHref: string;
}

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
