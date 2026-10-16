import { joinClassNames } from "../../../utils/class-names";
import { asStyle } from "../../../utils/as-style";
import type { BookingsView } from "./view";
import styles from "../../../styles/features/studio/bookings/past-row.module.css";
import shared from "../../../styles/features/studio/bookings/index.module.css";

interface PastRowProps {
  item: BookingsView["pastGroups"][number]["items"][number];
}

export const PastRow = ({ item }: PastRowProps) => (
  <button
    className={joinClassNames(shared.row, shared.pastRow)}
    style={asStyle({
      "--delay": item.delay,
      "--stripe": item.stripe,
      "--badge-bg": item.badgeBackground,
      "--badge-color": item.badgeColor,
    })}
    onClick={item.open}
  >
    <div className={shared.stripe}></div>
    <div className={shared.times}>
      <div className={shared.start}>{item.start}</div>
      <div className={shared.end}>{item.endTime}</div>
    </div>
    <img
      className={joinClassNames(
        shared.avatar,
        item.isFaded && shared.avatarFaded,
      )}
      src={item.imgSrc}
      alt=""
    />
    <div className={shared.grow}>
      <div className={shared.nameRow}>
        <span className={shared.name}>{item.clientName}</span>
        <span className={styles.pastBadge}>{item.status}</span>
      </div>
      <div className={shared.service}>{`${item.service} · ${item.when}`}</div>
    </div>
    <div className={styles.priceCell}>
      <div
        className={joinClassNames(
          shared.price,
          item.isStruck ? shared.pastPriceStruck : shared.pastPrice,
        )}
      >
        {item.priceLabel}
      </div>
      <div className={styles.priceMeta}>{item.priceMeta}</div>
    </div>
  </button>
);
