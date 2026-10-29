import {
  ArrowDownWideNarrow,
  ChevronDown,
  Plus,
  Search,
  X,
} from "lucide-react";
import type { StudioController } from "../core/use-studio";
import type { ClientsView } from "./view";
import styles from "../../../styles/features/studio/clients/controls.module.css";

interface ClientControlsProps {
  studio: StudioController;
  view: ClientsView;
}

export const ClientControls = ({ studio, view }: ClientControlsProps) => {
  const { state, setState } = studio;

  return (
    <div className={styles.controls}>
      <label className={styles.search}>
        <Search className={styles.noShrink} size={15} strokeWidth={1.5} />
        <input
          className={styles.searchInput}
          value={state.clientListQuery}
          onChange={(event) =>
            setState({ clientListQuery: event.target.value })
          }
          placeholder="Search"
          aria-label="Search clients by name, phone or email"
        />
        {!!state.clientListQuery && (
          <button
            className={styles.clearSearch}
            onClick={() => setState({ clientListQuery: "" })}
            aria-label="Clear search"
          >
            <X size={15} strokeWidth={1.7} />
          </button>
        )}
      </label>
      <label className={styles.sort}>
        <ArrowDownWideNarrow
          className={styles.sortIcon}
          size={15}
          strokeWidth={1.5}
        />
        <select
          className={styles.sortSelect}
          value={state.clientSort}
          onChange={(event) => setState({ clientSort: event.target.value })}
          aria-label="Sort clients"
        >
          <option value="next">Next booking</option>
          <option value="last">Last visit</option>
          <option value="visits">Most visits</option>
          <option value="az">A–Z</option>
        </select>
        <ChevronDown
          className={styles.sortChevron}
          size={14}
          strokeWidth={1.7}
        />
      </label>
      <button className={styles.addClient} onClick={view.addClient}>
        <Plus size={14} strokeWidth={2.2} />
        Add client
      </button>
    </div>
  );
};
