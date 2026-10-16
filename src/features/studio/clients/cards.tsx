import { asStyle } from "../../../utils/as-style";
import { joinClassNames } from "../../../utils/class-names";
import { NameLine } from "./name-line";
import type { ClientsView } from "./view";
import styles from "../../../styles/features/studio/clients/cards.module.css";
import shared from "../../../styles/features/studio/clients/index.module.css";

interface ClientCardsProps {
  view: ClientsView;
}

export const ClientCards = ({ view }: ClientCardsProps) =>
  view.clientRows.map((row) => (
    <button
      key={row.key}
      className={styles.cardRow}
      style={asStyle({ "--delay": row.delay })}
      onClick={row.open}
    >
      {row.img ? (
        <img className={styles.avatar44} src={row.img} alt="" />
      ) : (
        <span className={styles.initials44}>{row.initials}</span>
      )}
      <span className={styles.cardMain}>
        <NameLine row={row} />
        <span className={shared.contact}>{row.contact}</span>
        <span className={shared.contact}>{row.meta}</span>
      </span>
      <span className={styles.cardEnd}>
        <span className={styles.cardSpend}>{row.spend}</span>
        <span
          className={joinClassNames(
            styles.noShows,
            row.noShows > 0 && styles.noShowsSome,
          )}
        >
          {row.noShowLabel}
        </span>
      </span>
    </button>
  ));
