import type { KeyboardEvent } from "react";
import { joinClassNames } from "../../utils/class-names";
import styles from "../../styles/components/count-tabs/index.module.css";

export interface CountTab<Id extends string> {
  id: Id;
  label: string;
  count: number;
}

export interface CountTabsProps<Id extends string> {
  label: string;
  idPrefix: string;
  tabs: CountTab<Id>[];
  active: Id;
  onChange: (id: Id, isKeyboard: boolean) => void;
}

/** underline tabs with a count beside each label (Account › Bookings, Admin). */
export const CountTabs = <Id extends string>({
  label,
  idPrefix,
  tabs,
  active,
  onChange,
}: CountTabsProps<Id>) => {
  const onKey = (event: KeyboardEvent) => {
    const index = tabs.findIndex(({ id }) => id === active);

    const nextIndex: Record<string, number> = {
      ArrowLeft: Math.max(index - 1, 0),
      ArrowRight: Math.min(index + 1, tabs.length - 1),
      Home: 0,
      End: tabs.length - 1,
    };

    const next = tabs[nextIndex[event.key] ?? -1];

    if (!next) return;

    event.preventDefault();
    onChange(next.id, true);
    document.getElementById(`${idPrefix}-${next.id}`)?.focus();
  };

  // the tabs' arrow keys are handled on the tablist (the focused tab's keydown bubbles up)

  return (
    // eslint-disable-next-line jsx-a11y/interactive-supports-focus
    <div
      className={styles.tabs}
      role="tablist"
      aria-label={label}
      onKeyDown={onKey}
    >
      {tabs.map(({ id, label: tabLabel, count }) => {
        const isOn = active === id;

        return (
          <button
            key={id}
            type="button"
            className={joinClassNames(
              styles.tab,
              isOn ? styles.tabOn : styles.tabOff,
            )}
            id={`${idPrefix}-${id}`}
            role="tab"
            aria-selected={isOn}
            tabIndex={isOn ? 0 : -1}
            onClick={() => onChange(id, false)}
          >
            {tabLabel}
            <span className={styles.tabCount}>{String(count)}</span>
            <span
              className={joinClassNames(
                styles.tabBar,
                isOn ? styles.tabBarOn : styles.tabBarOff,
              )}
              aria-hidden="true"
            ></span>
          </button>
        );
      })}
    </div>
  );
};
