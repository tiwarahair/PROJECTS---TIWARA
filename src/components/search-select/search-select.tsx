import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { createPortal } from "react-dom";
import { joinClassNames } from "../../utils/class-names";
import styles from "./search-select.module.css";

/** A plain label, or a grouped / searchable-by-synonym option. `action` rows (e.g. "New category") always show. */
export interface SearchSelectOption {
  label: string;
  group?: string;
  keywords?: string[];
  dot?: string;
  action?: boolean;
}

export interface SearchSelectProps {
  options?: (string | SearchSelectOption)[];
  value?: string;
  placeholder?: string;
  disabled?: boolean;
  onChange?: (label: string) => void;
}

interface PanelRect {
  left: number;
  width: number;
  top: number;
  bottom: number;
  flip: boolean;
}

const toSentenceCase = (text: string) =>
  text ? text.charAt(0).toUpperCase() + text.slice(1) : text;

const Dot = ({ colour }: { colour: string }) => (
  // --dot-colour: category colours come from data
  <span
    aria-hidden="true"
    className={styles.dot}
    style={{ "--dot-colour": colour } as CSSProperties}
  />
);

/** Searchable select used by the Studio service wizard. */
export const SearchSelect = ({
  options = [],
  value = "",
  placeholder = "Select",
  disabled = false,
  onChange,
}: SearchSelectProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [rect, setRect] = useState<PanelRect | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const measure = useCallback(() => {
    if (!wrapRef.current) return;

    const bounds = wrapRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - bounds.bottom;
    const flip = spaceBelow < 280 && bounds.top > spaceBelow;

    setRect({
      left: bounds.left,
      width: bounds.width,
      top: bounds.bottom + 6,
      bottom: window.innerHeight - bounds.top + 6,
      flip,
    });
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    measure();

    const handleAway = (event: MouseEvent) => {
      const target = event.target as Node;

      if (
        !wrapRef.current?.contains(target) &&
        !panelRef.current?.contains(target)
      )
        setIsOpen(false);
    };

    document.addEventListener("mousedown", handleAway);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);

    return () => {
      document.removeEventListener("mousedown", handleAway);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [isOpen, measure]);

  // keyed on isOpen only: on the very first open the panel waits for its
  // measured rect, so the input is not mounted yet and focus stays on the trigger
  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  const normalised = options.map((option) =>
    typeof option === "string" ? { label: option } : option,
  );

  const needle = query.trim().toLowerCase();

  const visible = normalised.filter(
    ({ action, label, keywords }) =>
      action ||
      !needle ||
      label.toLowerCase().includes(needle) ||
      (keywords || []).some(
        (keyword) =>
          keyword.toLowerCase().includes(needle) ||
          needle.includes(keyword.toLowerCase()),
      ),
  );

  const current = normalised.find(({ label }) => label === value);

  // position comes from the trigger's measured rect; flips above when there is no room below
  const panelStyle = rect
    ? ({
        "--panel-left": `${rect.left}px`,
        "--panel-width": `${rect.width}px`,
        "--panel-top": rect.flip ? "auto" : `${rect.top}px`,
        "--panel-bottom": rect.flip ? `${rect.bottom}px` : "auto",
      } as CSSProperties)
    : undefined;

  return (
    <div ref={wrapRef} className={styles.wrap}>
      <button
        type="button"
        disabled={disabled}
        className={joinClassNames(styles.trigger, value && styles.hasValue)}
        onClick={() => {
          if (disabled) return;

          setQuery("");
          setIsOpen((open) => !open);
        }}
      >
        <span className={styles.triggerLabel}>
          {current?.dot ? <Dot colour={current.dot} /> : null}
          <span className={styles.triggerText}>
            {value ? toSentenceCase(value) : placeholder}
          </span>
        </span>
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--text-muted)"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 9.5l6 6 6-6" />
        </svg>
      </button>
      {isOpen &&
        !disabled &&
        rect &&
        createPortal(
          <div ref={panelRef} className={styles.panel} style={panelStyle}>
            <div className={styles.searchRow}>
              <input
                ref={inputRef}
                value={query}
                placeholder="Search"
                className={styles.search}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
            <div className={styles.list}>
              {visible.map(({ label, group, dot, action }, index) => (
                <Fragment key={`${label}::${index}`}>
                  {group &&
                  (index === 0 || visible[index - 1]?.group !== group) ? (
                    <div className={styles.groupLabel}>{group}</div>
                  ) : null}
                  <button
                    type="button"
                    className={joinClassNames(
                      styles.option,
                      label === value && styles.optionSelected,
                      action && styles.optionAction,
                    )}
                    onClick={() => {
                      onChange?.(label);
                      setIsOpen(false);
                    }}
                  >
                    {dot ? <Dot colour={dot} /> : null}
                    {toSentenceCase(label)}
                  </button>
                </Fragment>
              ))}
              {visible.filter(({ action }) => !action).length === 0 && (
                <div className={styles.empty}>No matches</div>
              )}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
};
