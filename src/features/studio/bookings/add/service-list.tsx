import { Search } from "lucide-react";
import { joinClassNames } from "../../../../utils/class-names";
import type { AddBookingView } from "./view";
import styles from "../../../../styles/features/studio/bookings/add/service-list.module.css";
import shared from "../../../../styles/features/studio/bookings/add/index.module.css";

interface ServiceListProps {
  view: AddBookingView;
}

/** Step 2: the service list and the selected service. */
export const ServiceList = ({ view }: ServiceListProps) => (
  <>
    <label className={styles.searchField}>
      <Search
        className={styles.noShrink}
        size={16}
        strokeWidth={1.7}
        color="var(--text-secondary)"
      />
      <input
        className={styles.searchFieldInput}
        value={view.serviceQuery}
        onChange={view.onServiceQuery}
        placeholder="Search services"
      />
    </label>
    <div className={styles.serviceList}>
      {view.serviceGroups.map(({ key, category, count, items }) => (
        <div key={key} className={styles.group}>
          <div className={styles.groupHead}>
            <span className={styles.h3}>{category}</span>
            <span className={styles.count}>{count}</span>
          </div>
          <div className={styles.stack6}>
            {items.map((item) => (
              <button
                key={item.key}
                className={joinClassNames(
                  styles.option,
                  item.isOn && styles.optionOn,
                )}
                onClick={item.pick}
              >
                <span className={shared.grow}>
                  <span className={styles.optionName}>{item.name}</span>
                  <span className={styles.optionSub}>{item.duration}</span>
                </span>
                <span className={styles.optionPrice}>{item.priceLabel}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
    {view.isServiceEmpty && (
      <div className={styles.empty}>
        <div className={styles.emptyTitle}>No services match</div>
        <div className={styles.emptyBody}>Try a different search.</div>
      </div>
    )}
    {view.isServicePicked && (
      <div className={styles.picked}>
        <div className={shared.grow}>
          <div className={styles.pickedLabel}>Selected service</div>
          <div className={styles.pickedName}>{view.selectedName}</div>
          <div className={styles.pickedMeta}>{view.selectedMeta}</div>
        </div>
        <button className={styles.editForThis} onClick={view.openEdit}>
          Edit for this booking
        </button>
      </div>
    )}
  </>
);
