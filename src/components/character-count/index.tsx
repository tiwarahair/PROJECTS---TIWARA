import { joinClassNames } from "../../utils/class-names";
import styles from "../../styles/components/character-count/index.module.css";

export interface CharacterCountProps {
  id?: string;
  length: number;
  max: number;
  showFrom: number;
}

export const CharacterCount = ({
  id,
  length,
  max,
  showFrom,
}: CharacterCountProps) =>
  length >= showFrom ? (
    <div
      id={id}
      aria-live="polite"
      className={joinClassNames(
        styles.count,
        length >= max && styles.countFull,
      )}
    >
      {length} / {max}
    </div>
  ) : null;
