import { X } from "lucide-react";
import { joinClassNames } from "../../../../../utils/class-names";
import {
  DURATION_HOUR_OPTIONS,
  DURATION_MINUTE_OPTIONS,
} from "../../catalog-sheets-view";
import type { WizardView } from "../view";
import styles from "../../../../../styles/features/studio/services/wizard/dialogs/new-addon.module.css";

export interface NewAddonDialogProps {
  view: WizardView;
}

/** Quick-create an add-on from the wizard's Add-ons step. */
export const NewAddonDialog = ({ view }: NewAddonDialogProps) => {
  const { addons, isWide } = view;
  const draft = addons.newAddon;

  if (!draft) return null;

  const timeSelects = [
    {
      key: "hours",
      value: addons.newHour,
      label: "Hours",
      options: DURATION_HOUR_OPTIONS,
    },
    {
      key: "min",
      value: addons.newMinute,
      label: "Minutes",
      options: DURATION_MINUTE_OPTIONS,
    },
  ];

  return (
    <>
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
      <div className={styles.scrim80} onClick={addons.cancelNew}></div>
      <div className={joinClassNames(styles.addon, isWide && styles.addonWide)}>
        <div className={styles.head}>
          <div className={styles.grow}>
            <div className={styles.title}>New add-on</div>
          </div>
          <button
            className={styles.close}
            onClick={addons.cancelNew}
            aria-label="Close"
          >
            <X size={19} strokeWidth={2} />
          </button>
        </div>
        <div className={styles.stack12}>
          <label className={styles.block}>
            <span className={styles.fieldLabel}>Name</span>
            <input
              className={styles.input}
              value={draft.name}
              onChange={(event) =>
                addons.patchNew({ name: event.target.value })
              }
              placeholder="e.g. Beads"
            />
          </label>
          <label className={styles.block}>
            <span className={styles.fieldLabel}>Category</span>
            <select
              className={styles.select}
              value={addons.newCategory}
              onChange={(event) =>
                addons.patchNew({
                  categoryId:
                    event.target.value === "none" ? null : event.target.value,
                })
              }
            >
              {addons.newCategoryOptions.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <div className={styles.priceTime}>
            <label className={styles.block}>
              <span className={styles.fieldLabel}>Added price</span>
              <span className={styles.inline5}>
                <span className={styles.prefix}>+£</span>
                <input
                  className={styles.priceInput}
                  value={draft.price}
                  onChange={(event) =>
                    addons.patchNew({ price: event.target.value })
                  }
                  inputMode="decimal"
                  placeholder="0"
                />
              </span>
            </label>
            <label className={styles.block}>
              <span className={styles.fieldLabel}>Added time</span>
              <span className={styles.inline6}>
                {timeSelects.map(({ key, value, label, options }) => (
                  <select
                    key={key}
                    className={styles.timeSelect}
                    value={value}
                    onChange={(event) =>
                      addons.patchNew({ [key]: event.target.value })
                    }
                    aria-label={label}
                  >
                    {options.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ))}
              </span>
            </label>
          </div>
        </div>
        <div className={styles.actions}>
          <button className={styles.cancel} onClick={addons.cancelNew}>
            Cancel
          </button>
          <button className={styles.create} onClick={addons.createNew}>
            Create add-on
          </button>
        </div>
      </div>
    </>
  );
};
