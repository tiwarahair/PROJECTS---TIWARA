import type { CSSProperties } from "react";
import { joinClassNames } from "../../utils/class-names";
import styles from "./tabs.module.css";
import { useControllable } from "./use-controllable";

/** Underline tabs; active gets crimson underline. */
export interface TabsProps {
  tabs?: string[];
  active?: string;
  defaultTab?: string;
  onChange?: (tab: string) => void;
  style?: CSSProperties;
  className?: string;
}

export const Tabs = ({
  tabs = [],
  active,
  defaultTab,
  onChange,
  style,
  className,
}: TabsProps) => {
  const [current, setCurrent] = useControllable(active, defaultTab || tabs[0]);

  return (
    <div className={joinClassNames(styles.tabs, className)} style={style}>
      {tabs.map((tab) => (
        <button
          key={tab}
          type="button"
          className={joinClassNames(
            styles.tab,
            current === tab && styles.active,
          )}
          onClick={() => {
            setCurrent(tab);
            onChange?.(tab);
          }}
        >
          {tab}
        </button>
      ))}
    </div>
  );
};
