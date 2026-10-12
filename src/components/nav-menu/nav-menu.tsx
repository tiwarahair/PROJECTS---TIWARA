import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties, MouseEvent, ReactNode } from "react";
import { Link } from "react-router";
import { prefersReducedMotion } from "../../utils/page-flags";
import styles from "./nav-menu.module.css";

export type NavMenuItem =
  | {
      kind: "link";
      key: string;
      label: string;
      to: string;
      isCurrent?: boolean;
      dataTab?: string;
      onClick?: (event: MouseEvent) => void;
    }
  | {
      kind: "button";
      key: string;
      label: string;
      onClick: (event: MouseEvent) => void;
    }
  | { kind: "separator"; key: string }
  | { kind: "label"; key: string; label: string };

export interface NavMenuProps {
  anchor: HTMLElement;
  /** Accessible name of the menu. */
  label: string;
  /** Optional block above the rows (the account menu's name and email). */
  head?: ReactNode;
  items: NavMenuItem[];
  /** Pinned (?acctmenu=1 boards): stays open on outside clicks and does not take focus. */
  pinned?: boolean;
  onClose: (refocus: boolean) => void;
}

/**
 * A pop-up menu anchored under its trigger: centred on the trigger and kept on
 * screen, closes on outside click, resize, Tab and Escape, and moves focus with the arrow / Home / End keys.
 */
export const NavMenu = ({
  anchor,
  label,
  head,
  items,
  pinned = false,
  onClose,
}: NavMenuProps) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLElement | null)[]>([]);
  const [anchorRect] = useState(() => anchor.getBoundingClientRect());

  const [left, setLeft] = useState(() =>
    Math.max(
      12,
      Math.min(
        window.innerWidth - 252,
        (anchorRect.left + anchorRect.right) / 2 - 120,
      ),
    ),
  );

  const [measured, setMeasured] = useState(false);
  const [entered, setEntered] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const focusableCount = items.filter(
    ({ kind }) => kind === "link" || kind === "button",
  ).length;

  useLayoutEffect(() => {
    const menuWidth = menuRef.current?.offsetWidth ?? 240;
    const centre = (anchorRect.left + anchorRect.right) / 2;

    setLeft(
      Math.max(
        12,
        Math.min(window.innerWidth - menuWidth - 12, centre - menuWidth / 2),
      ),
    );

    setMeasured(true);

    const frame = requestAnimationFrame(() => {
      setEntered(true);

      if (!pinned) itemRefs.current[0]?.focus();
    });

    return () => cancelAnimationFrame(frame);
  }, [anchorRect, pinned]);

  useEffect(() => {
    anchor.setAttribute("aria-expanded", "true");

    const handleOutside = (event: globalThis.MouseEvent) => {
      const target = event.target as Node;

      if (
        !pinned &&
        !menuRef.current?.contains(target) &&
        !anchor.contains(target)
      )
        onClose(false);
    };

    const handleResize = () => onClose(false);

    document.addEventListener("mousedown", handleOutside, true);
    window.addEventListener("resize", handleResize);

    return () => {
      anchor.setAttribute("aria-expanded", "false");
      document.removeEventListener("mousedown", handleOutside, true);
      window.removeEventListener("resize", handleResize);
    };
  }, [anchor, pinned, onClose]);

  // keyboard handled on the document (capture), so a pinned menu without focus still responds
  useEffect(() => {
    const focusItem = (index: number) => itemRefs.current[index]?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      const index = itemRefs.current.findIndex(
        (item) => item === document.activeElement,
      );

      if (event.key === "Escape") {
        event.preventDefault();
        onClose(true);
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        focusItem((index + 1) % focusableCount);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        focusItem((index - 1 + focusableCount) % focusableCount);
      } else if (event.key === "Home") {
        event.preventDefault();
        focusItem(0);
      } else if (event.key === "End") {
        event.preventDefault();
        focusItem(focusableCount - 1);
      } else if (event.key === "Tab") onClose(false);
    };

    document.addEventListener("keydown", handleKeyDown, true);

    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [onClose, focusableCount]);

  const className = [
    styles.menu,
    measured && styles.measured,
    measured && prefersReducedMotion() && styles.reduced,
    entered && styles.entered,
  ]
    .filter(Boolean)
    .join(" ");

  let focusIndex = 0;

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label={label}
      className={className}
      // --menu-top/--menu-left: measured from the trigger at open time
      style={
        {
          "--menu-top": `${anchorRect.bottom + 8}px`,
          "--menu-left": `${left}px`,
        } as CSSProperties
      }
    >
      {head && <div className={styles.head}>{head}</div>}
      {items.map((item) => {
        if (item.kind === "separator")
          return (
            <div
              key={item.key}
              role="separator"
              className={styles.separator}
            ></div>
          );

        if (item.kind === "label")
          return (
            <div key={item.key} role="presentation" className={styles.label}>
              {item.label}
            </div>
          );

        const index = focusIndex++;
        const isCurrent = item.kind === "link" && !!item.isCurrent;

        const rowProps = {
          role: "menuitem",
          tabIndex: -1,
          onMouseEnter: () => setActiveIndex(index),
          onFocus: () => setActiveIndex(index),
          onMouseLeave: () => setActiveIndex(null),
          className: [
            styles.row,
            isCurrent && styles.current,
            activeIndex === index && styles.active,
          ]
            .filter(Boolean)
            .join(" "),
        };

        return item.kind === "link" ? (
          <Link
            key={item.key}
            ref={(element) => {
              itemRefs.current[index] = element;
            }}
            to={item.to}
            data-tab={item.dataTab}
            aria-current={isCurrent ? "page" : undefined}
            onClick={item.onClick}
            {...rowProps}
          >
            {item.label}
          </Link>
        ) : (
          <button
            key={item.key}
            type="button"
            ref={(element) => {
              itemRefs.current[index] = element;
            }}
            onClick={item.onClick}
            {...rowProps}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
};

/** Name and email block shown at the top of the account menus. */
export const NavMenuAccountHead = ({
  name,
  email,
}: {
  name: string;
  email: string;
}) => (
  <>
    <div className={styles.name}>{name}</div>
    <div className={styles.email}>{email}</div>
  </>
);
