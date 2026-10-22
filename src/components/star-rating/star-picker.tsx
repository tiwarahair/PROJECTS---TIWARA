import { Star } from "lucide-react";
import { useState } from "react";
import { joinClassNames } from "../../utils/class-names";
import styles from "../../styles/components/star-rating/star-picker.module.css";

const STARS = [1, 2, 3, 4, 5];

const LABELS = ["", "Poor", "Fair", "Good", "Very good", "Excellent"];

interface StarPickerProps {
  value: number;
  onChange: (rating: number) => void;
}

/** Five star radios; hovering previews a rating. */
export const StarPicker = ({ value, onChange }: StarPickerProps) => {
  const [preview, setPreview] = useState(0);
  const shown = preview || value;

  return (
    <div className={styles.picker} onMouseLeave={() => setPreview(0)}>
      <div role="radiogroup" aria-label="Your rating" className={styles.stars}>
        {STARS.map((star) => (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={value === star}
            aria-label={`${star} star${star === 1 ? "" : "s"}, ${LABELS[star]}`}
            className={joinClassNames(
              styles.star,
              star <= shown && styles.starOn,
            )}
            onMouseEnter={() => setPreview(star)}
            onClick={() => onChange(star)}
          >
            <Star size={34} strokeWidth={1.4} />
          </button>
        ))}
      </div>
      <span className={styles.label} aria-hidden="true">
        {LABELS[shown] || "Tap a star"}
      </span>
    </div>
  );
};
