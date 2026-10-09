import type { ReviewView } from "./profile-logic";
import styles from "./profile-reviews.module.css";

interface ProfileReviewsProps {
  reviews: ReviewView[];
}

export const ProfileReviews = ({ reviews }: ProfileReviewsProps) => (
  <>
    <h2 data-rv="" className={styles.title}>
      Reviews
    </h2>
    <div className={styles.grid}>
      {reviews.map(({ key, starFills, text, name, style }) => (
        <div key={key} data-rv="">
          <div className={styles.stars}>
            {starFills.map((fill, index) => (
              <svg
                key={index}
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill={fill}
              >
                <path d="M12 2l3 6.6 7 .7-5.3 4.7 1.6 7-6.3-3.8L5.7 21l1.6-7L2 9.3l7-.7z"></path>
              </svg>
            ))}
          </div>
          <p className={styles.text}>{text}</p>
          <div className={styles.meta}>
            <strong className={styles.name}>{name}</strong> {"· "}
            {style}
          </div>
        </div>
      ))}
    </div>
  </>
);
