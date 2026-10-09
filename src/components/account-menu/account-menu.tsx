import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { useAppDispatch } from "../../stores/hooks";
import { DEMO_ACCOUNT, logOut } from "../../stores/session-slice";
import { prefersReducedMotion } from "../../utils/page-flags";
import styles from "./account-menu.module.css";

export const ACCOUNT_TAB_EVENT = "tw-acct-tab";

const MENU_ITEMS = [
  { tab: "bookings", label: "Bookings", href: "/account?section=bookings" },
  {
    tab: "favourites",
    label: "Favourites",
    href: "/account?section=favourites",
  },
  {
    tab: "personal",
    label: "Account settings",
    href: "/account?section=personal",
  },
  { tab: "help", label: "Help & support", href: "/help" },
];
const LOG_OUT_INDEX = MENU_ITEMS.length;
const LEGACY_TABS: Record<string, string> = {
  details: "shared",
  marketing: "communication",
};

export interface AccountMenuProps {
  anchor: HTMLElement;
  /** Pinned (?acctmenu=1 boards): stays open on outside clicks and does not take focus. */
  pinned: boolean;
  onClose: (refocus: boolean) => void;
}

export const AccountMenu = ({ anchor, pinned, onClose }: AccountMenuProps) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
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

  const onAccountPage = pathname === "/account";
  const params = new URLSearchParams(search);
  const tabParam = params.get("tab");
  const currentTab =
    params.get("section") ||
    (tabParam ? LEGACY_TABS[tabParam] || tabParam : "") ||
    "";

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
    const handleOutside = (event: MouseEvent) => {
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

  // keyboard handled on the document (capture) like the prototype, so a pinned menu without focus still responds
  useEffect(() => {
    const itemCount = LOG_OUT_INDEX + 1;
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
        focusItem((index + 1) % itemCount);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        focusItem((index - 1 + itemCount) % itemCount);
      } else if (event.key === "Home") {
        event.preventDefault();
        focusItem(0);
      } else if (event.key === "End") {
        event.preventDefault();
        focusItem(itemCount - 1);
      } else if (event.key === "Tab") onClose(false);
    };
    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [onClose]);

  const getRowProps = (index: number) => ({
    role: "menuitem",
    tabIndex: -1,
    onMouseEnter: () => setActiveIndex(index),
    onFocus: () => setActiveIndex(index),
    onMouseLeave: () => setActiveIndex(null),
  });

  const className = [
    styles.menu,
    measured && styles.measured,
    measured && prefersReducedMotion() && styles.reduced,
    entered && styles.entered,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label={DEMO_ACCOUNT.name}
      className={className}
      // --menu-top/--menu-left: measured from the trigger at open time
      style={
        {
          "--menu-top": anchorRect.bottom + 8 + "px",
          "--menu-left": left + "px",
        } as CSSProperties
      }
    >
      <div className={styles.head}>
        <div className={styles.name}>{DEMO_ACCOUNT.name}</div>
        <div className={styles.email}>{DEMO_ACCOUNT.email}</div>
      </div>
      {MENU_ITEMS.map(({ tab, label, href }, index) => {
        const isHere = onAccountPage && tab === currentTab;
        return (
          <Link
            key={tab}
            ref={(element) => {
              itemRefs.current[index] = element;
            }}
            to={href}
            data-tab={tab}
            aria-current={isHere ? "page" : undefined}
            className={[
              styles.row,
              isHere && styles.current,
              activeIndex === index && styles.active,
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={(event) => {
              if (onAccountPage && tab !== "help") {
                event.preventDefault();
                onClose(false);
                window.dispatchEvent(
                  new CustomEvent(ACCOUNT_TAB_EVENT, { detail: tab }),
                );
              }
            }}
            {...getRowProps(index)}
          >
            {label}
          </Link>
        );
      })}
      <div role="separator" className={styles.separator}></div>
      <button
        type="button"
        ref={(element) => {
          itemRefs.current[LOG_OUT_INDEX] = element;
        }}
        className={[styles.row, activeIndex === LOG_OUT_INDEX && styles.active]
          .filter(Boolean)
          .join(" ")}
        onClick={(event) => {
          event.preventDefault();
          onClose(false);
          dispatch(logOut());
          navigate("/");
        }}
        {...getRowProps(LOG_OUT_INDEX)}
      >
        Log out
      </button>
    </div>
  );
};
