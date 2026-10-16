import { asStyle } from "../../../utils/as-style";
import { joinClassNames } from "../../../utils/class-names";
import { NameLine } from "./name-line";
import type { ClientsView } from "./view";
import styles from "../../../styles/features/studio/clients/table.module.css";
import shared from "../../../styles/features/studio/clients/index.module.css";

interface ClientTableProps {
  view: ClientsView;
}

export const ClientTable = ({ view }: ClientTableProps) => (
  <>
    <div className={styles.tableHead}>
      <span>Client</span>
      <span>Last visit</span>
      <span>Next booking</span>
      <span className={styles.nowrapRight}>Upcoming appointments</span>
      <span className={styles.right}>Spend</span>
    </div>
    {view.clientRows.map((row) => (
      <button
        key={row.key}
        className={styles.tableRow}
        style={asStyle({ "--delay": row.delay })}
        onClick={row.open}
      >
        <span className={styles.clientCell}>
          {row.img ? (
            <img className={styles.avatar40} src={row.img} alt="" />
          ) : (
            <span className={styles.initials40}>{row.initials}</span>
          )}
          <span className={styles.nameStack}>
            <NameLine row={row} />
            <span className={shared.contact}>{row.contact}</span>
          </span>
        </span>
        <span className={styles.cell}>{row.last}</span>
        <span
          className={joinClassNames(
            styles.nextCell,
            row.hasNext && styles.hasNext,
          )}
        >
          {row.next}
        </span>
        <span
          className={joinClassNames(
            styles.upCell,
            row.hasNext && styles.hasNext,
          )}
        >
          {row.upcomingCount}
        </span>
        <span className={styles.spendCell}>{row.spend}</span>
      </button>
    ))}
  </>
);
