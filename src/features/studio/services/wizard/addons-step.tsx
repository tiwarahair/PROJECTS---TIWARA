import { ChevronRight, Plus, Search, X } from "lucide-react";
import { joinClassNames } from "../../../../utils/class-names";
import type { WizardView } from "./view";
import parts from "../../../../styles/features/studio/services/wizard/parts.module.css";
import styles from "../../../../styles/features/studio/services/wizard/addons-step.module.css";

interface AddonsStepProps {
  view: WizardView;
}

/** Step 4: pick add-ons and override their price / time for this service. */
export const AddonsStep = ({ view }: AddonsStepProps) => {
  const { addons } = view;
  const { picker } = addons;

  return (
    <>
      <div className={parts.intro}>
        Extras clients can add when they book. Price and time are added on top.
      </div>
      <div>
        <div className={styles.addonHead}>
          <div className={styles.addonTitle}>Add-ons</div>
          <button className={styles.newButton} onClick={addons.toggleNew}>
            <Plus className={parts.block} size={14} strokeWidth={2.2} />
            New
          </button>
        </div>
        <label className={styles.searchField}>
          <Search
            className={styles.noShrink}
            size={16}
            strokeWidth={1.7}
            color="var(--text-secondary)"
          />
          <input
            className={styles.searchInput}
            value={picker.query}
            onChange={picker.onQuery}
            placeholder="Search add-ons"
            aria-label="Search add-ons"
          />
        </label>
        <div className={styles.chips}>
          {picker.chips.map(({ key, label, isOn, onSelect }) => (
            <button
              key={key}
              className={joinClassNames(styles.chip, isOn && styles.chipOn)}
              onClick={onSelect}
            >
              {label}
            </button>
          ))}
        </div>
        {picker.groups.map(({ key, category, count, items }) => (
          <div key={key} className={styles.group}>
            <div className={styles.groupHead}>
              <span className={styles.groupName}>{category}</span>
              <span className={styles.groupCount}>{count}</span>
            </div>
            <div className={styles.stack6}>
              {items.map((item) => (
                <button
                  key={item.key}
                  className={styles.addonPick}
                  onClick={item.pick}
                  aria-pressed={item.isOn ? "true" : "false"}
                >
                  <span className={parts.grow}>
                    <span className={styles.addonPickName}>{item.name}</span>
                    <span className={styles.addonPickMeta}>{item.meta}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}
        {picker.isEmpty && (
          <div className={styles.nothingLeft}>
            Nothing left to add here. Try another category, or use New to create
            one.
          </div>
        )}
      </div>
      <div className={styles.addedTitle}>Added to this service</div>
      {!addons.selected.length && (
        <div className={styles.noneAdded}>
          No add-ons on this service yet. Select one above and it will appear
          here.
        </div>
      )}
      {addons.selected.map((item) => (
        <div key={item.key} className={styles.attached}>
          <div className={styles.attachedRow}>
            <button className={styles.attachedOpen} onClick={item.toggle}>
              <ChevronRight
                className={joinClassNames(
                  styles.chevron,
                  item.isOpen && styles.chevronOpen,
                )}
                size={14}
                strokeWidth={2}
                color="var(--text-secondary)"
              />
              <span className={parts.grow}>
                <span className={styles.attachedName}>{item.name}</span>
                <span className={styles.addonPickMeta}>{item.meta}</span>
              </span>
            </button>
            <button
              className={styles.remove}
              onClick={item.remove}
              aria-label="Remove add-on"
            >
              <X size={14} strokeWidth={2} />
            </button>
          </div>
          {item.isOpen && (
            <div className={styles.overrides}>
              <div className={styles.overridesLabel}>Overrides</div>
              <div className={styles.inline5}>
                <span className={parts.muted135}>+£</span>
                <input
                  className={styles.ovPrice}
                  value={item.price}
                  onChange={item.setPrice}
                  inputMode="decimal"
                  placeholder={item.pricePlaceholder}
                />
                <span className={styles.ovPlus}>+</span>
                <input
                  className={styles.ovTime}
                  value={item.hours}
                  onChange={item.setHours}
                  inputMode="numeric"
                  placeholder={item.hoursPlaceholder}
                />
                <span className={parts.unit}>hr</span>
                <input
                  className={styles.ovTime}
                  value={item.minutes}
                  onChange={item.setMinutes}
                  inputMode="numeric"
                  placeholder={item.minutesPlaceholder}
                />
                <span className={parts.unit}>min</span>
              </div>
            </div>
          )}
        </div>
      ))}
    </>
  );
};
