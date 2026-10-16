import type { ChangeEvent } from "react";
import { Search } from "lucide-react";
import styles from "../../../../styles/features/studio/bookings/steps/search-field.module.css";

interface SearchFieldProps {
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
}

export const SearchField = ({
  value,
  onChange,
  placeholder,
}: SearchFieldProps) => (
  <label className={styles.search}>
    <Search
      className={styles.searchIcon}
      size={16}
      strokeWidth={1.7}
      color="var(--text-secondary)"
    />
    <input
      className={styles.searchInput}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
    />
  </label>
);
