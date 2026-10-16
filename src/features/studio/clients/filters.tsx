import { joinClassNames } from "../../../utils/class-names";
import type { ClientsView } from "./view";
import styles from "../../../styles/features/studio/clients/filters.module.css";

interface ClientFiltersProps {
  view: ClientsView;
}

export const ClientFilters = ({ view }: ClientFiltersProps) => (
  <div className={styles.filters}>
    {view.filters.map(({ key, label, count, isOn, onSelect }) => (
      <button
        key={key}
        className={joinClassNames(styles.filter, isOn && styles.filterOn)}
        onClick={onSelect}
      >
        {label}
        <span className={styles.filterCount}>{count}</span>
      </button>
    ))}
  </div>
);
