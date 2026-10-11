import { useCallback, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { NavMenu } from "../../components/nav-menu/nav-menu";
import type { NavMenuItem } from "../../components/nav-menu/nav-menu";
import { useAppDispatch, useAppSelector } from "../../stores/hooks";
import { logOut } from "../../stores/session-slice";
import styles from "./search-nav.module.css";

/** The nav's ☰ button and its pop-up menu (the prototype's Search menu button did nothing). */
export const SearchMenu = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const loggedIn = useAppSelector((root) => root.session.loggedIn);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const close = useCallback((refocus: boolean) => {
    setIsOpen(false);
    if (refocus) buttonRef.current?.focus();
  }, []);

  const items: NavMenuItem[] = [
    {
      kind: "link",
      key: "search",
      label: "Find a stylist",
      to: "/search",
      isCurrent: true,
    },
    { kind: "link", key: "services", label: "Services", to: "/#stylegrid" },
    { kind: "separator", key: "separator" },
    ...(loggedIn
      ? ([
          { kind: "label", key: "account", label: "Account" },
          {
            kind: "link",
            key: "bookings",
            label: "Bookings",
            to: "/account?section=bookings",
          },
          {
            kind: "link",
            key: "favourites",
            label: "Favourites",
            to: "/account?section=favourites",
          },
          {
            kind: "link",
            key: "personal",
            label: "Account settings",
            to: "/account?section=personal",
          },
          { kind: "link", key: "help", label: "Help & support", to: "/help" },
          {
            kind: "button",
            key: "log-out",
            label: "Log out",
            onClick: () => {
              close(false);
              dispatch(logOut());
              navigate("/");
            },
          },
        ] satisfies NavMenuItem[])
      : ([
          { kind: "link", key: "log-in", label: "Log in", to: "/login" },
          { kind: "link", key: "help", label: "Help & support", to: "/help" },
        ] satisfies NavMenuItem[])),
  ];

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-label="Menu"
        aria-haspopup="menu"
        aria-expanded={isOpen ? "true" : "false"}
        className={styles.menuButton}
      >
        <span className={styles.menuLine}></span>
        <span className={styles.menuLine}></span>
      </button>
      {isOpen && buttonRef.current && (
        <NavMenu
          anchor={buttonRef.current}
          label="Menu"
          items={items}
          onClose={close}
        />
      )}
    </>
  );
};
