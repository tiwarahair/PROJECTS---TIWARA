import { Check } from "lucide-react";
import { joinClassNames } from "../../../../utils/class-names";
import type { AddonPicker } from "../../services/addon-picker";
import { NoMatches } from "./no-matches";
import { OptionGroup } from "./option-group";
import { SearchField } from "./search-field";
import styles from "../../../../styles/features/studio/bookings/steps/addon-picker.module.css";
import shared from "../../../../styles/features/studio/bookings/steps/index.module.css";

interface AddonPickerListProps {
  picker: AddonPicker;
  className?: string;
}

/** The add-on picker's search, category chips and grouped rows. */
export const AddonPickerList = ({
  picker,
  className,
}: AddonPickerListProps) => (
  <div className={className}>
    <SearchField
      value={picker.query}
      onChange={picker.onQuery}
      placeholder="Search add-ons"
    />
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
      <OptionGroup key={key} category={category} count={count}>
        {items.map((item) => (
          <button
            key={item.key}
            className={joinClassNames(shared.pick, item.isOn && shared.pickOn)}
            onClick={item.pick}
            aria-pressed={item.isOn ? "true" : "false"}
          >
            <span className={shared.grow}>
              <span className={shared.optionName}>{item.name}</span>
              <span className={shared.optionSub}>{item.meta}</span>
            </span>
            <span className={shared.tick}>
              <Check className={shared.tickMark} size={12} strokeWidth={3} />
            </span>
          </button>
        ))}
      </OptionGroup>
    ))}
    {picker.isEmpty && <NoMatches title="No add-ons match" />}
    {picker.hasDone && (
      <div className={styles.doneBar}>
        <button className={styles.doneButton} onClick={picker.done}>
          {picker.doneLabel}
        </button>
      </div>
    )}
  </div>
);
