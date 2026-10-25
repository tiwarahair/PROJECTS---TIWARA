import styles from "../../styles/components/review-rules-link/index.module.css";

/** "our review rules", opening the review policy in a new tab */
export const ReviewRulesLink = () => (
  <a className={styles.link} href="/reviews" target="_blank" rel="noreferrer">
    our review rules
  </a>
);
