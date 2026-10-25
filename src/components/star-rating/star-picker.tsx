import { Star } from "lucide-react";
import { useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { joinClassNames } from "../../utils/class-names";
import styles from "../../styles/components/star-rating/star-picker.module.css";

const STARS = [1, 2, 3, 4, 5];

const LABELS = ["", "Poor", "Fair", "Good", "Very good", "Excellent"];

const STEPS: Record<string, number> = {
  ArrowRight: 1,
  ArrowUp: 1,
  ArrowLeft: -1,
  ArrowDown: -1,
};

interface StarPickerProps {
  value: number;
  onChange: (rating: number) => void;
}

/** Five star radios: one tab stop, arrow keys move the rating, hovering previews it. */
export const StarPicker = ({ value, onChange }: StarPickerProps) => {
  const [preview, setPreview] = useState(0);
  const starRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const shown = preview || value;
  const focusable = value || 1;

  const handleKey = (event: KeyboardEvent) => {
    const step = STEPS[event.key];

    if (!step) return;

    event.preventDefault();
    const next = Math.min(5, Math.max(1, focusable + step));

    onChange(next);
    starRefs.current[next - 1]?.focus();
  };

  return (
    <div className={styles.picker} onMouseLeave={() => setPreview(0)}>
      <div role="radiogroup" aria-label="Your rating" className={styles.stars}>
        {STARS.map((star) => (
          <button
            key={star}
            ref={(element) => {
              starRefs.current[star - 1] = element;
            }}
            type="button"
            role="radio"
            aria-checked={value === star}
            tabIndex={star === focusable ? 0 : -1}
            aria-label={`${star} star${star === 1 ? "" : "s"}, ${LABELS[star]}`}
            className={joinClassNames(
              styles.star,
              star <= shown && styles.starOn,
            )}
            onKeyDown={handleKey}
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
