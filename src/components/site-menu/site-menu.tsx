import { useCallback, useEffect, useRef, useState } from "react";
import type { MouseEvent, ReactNode } from "react";
import { useLocation, useNavigate } from "react-router";
import { useIdentity } from "../../hooks/use-identity";
import { useAppDispatch } from "../../stores/hooks";
import { logOut } from "../../stores/session-slice";
import { resolveAssetUrl } from "../../utils/asset-url";
import { getSearchParams } from "../../utils/page-flags";
import { NavMenu, NavMenuAccountHead } from "../nav-menu/nav-menu";
import type { NavMenuItem } from "../nav-menu/nav-menu";
import styles from "../../styles/components/site-menu/site-menu.module.css";

export const ACCOUNT_TAB_EVENT = "tw-acct-tab";

const ACCOUNT_SECTIONS = [
  ["bookings", "Bookings"],
  ["favourites", "Favourites"],
  ["personal", "Account settings"],
] as const;

const LEGACY_TABS: Record<string, string> = {
  details: "shared",
  marketing: "communication",
};

/**
 * On the account page, a link to one of its sections switches the section in place instead of navigating.
 * Returns whether it did.
 */
export const openAccountSection = (event: MouseEvent, section: string) => {
  if (window.location.pathname !== "/account") return false;

  event.preventDefault();
  window.dispatchEvent(new CustomEvent(ACCOUNT_TAB_EVENT, { detail: section }));

  return true;
};

const getCurrentSection = (search: string) => {
  const params = new URLSearchParams(search);
  const tab = params.get("tab");

  return params.get("section") || (tab ? LEGACY_TABS[tab] || tab : "");
};

interface AccountAvatarProps {
  initials: string;
  photo?: string | null;
  hasChevron?: boolean;
  /** Replaces the default avatar circle style. */
  className?: string;
}

/** The account trigger's contents: the photo or initials, and a chevron. */
export const AccountAvatar = ({
  initials,
  photo,
  hasChevron = true,
  className = styles.avatar,
}: AccountAvatarProps) => (
  <>
    <span aria-hidden="true" className={className}>
      {photo ? (
        <img
          className={styles.avatarImage}
          src={resolveAssetUrl(photo)}
          alt=""
        />
      ) : (
        initials
      )}
    </span>
    {hasChevron && (
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="m6 9 6 6 6-6"></path>
      </svg>
    )}
  </>
);

interface SiteMenuProps {
  isSignedIn: boolean;
  loginHref?: string;
  /** The trigger button's class; defaults to the avatar-and-chevron button. */
  className?: string;
  /** Rows added at the foot of the menu, e.g. Home's Book now. */
  extraItems?: NavMenuItem[];
  /** The trigger's contents: an AccountAvatar when signed in, burger lines when not. */
  children: ReactNode;
}

/**
 * The site menu: a trigger button and the pop-up menu it opens, the same on every page.
 * Site links, then the account sections and Log out, or Log in and Help & support for guests.
 */
export const SiteMenu = ({
  isSignedIn,
  loginHref = "/login",
  className = styles.accountButton,
  extraItems = [],
  children,
}: SiteMenuProps) => {
  const identity = useIdentity();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [menu, setMenu] = useState<{ pinned: boolean } | null>(null);

  const close = useCallback((refocus: boolean) => {
    setMenu(null);

    if (refocus) buttonRef.current?.focus();
  }, []);

  // ?acctmenu=1 boards open the menu pinned, from whichever trigger is on screen
  useEffect(() => {
    if (getSearchParams().get("acctmenu") !== "1") return;

    const timer = window.setTimeout(() => {
      if (buttonRef.current?.offsetParent) setMenu({ pinned: true });
    }, 900);

    return () => window.clearTimeout(timer);
  }, []);

  const closeOnClick = () => close(false);

  // on the page with the services grid, scroll to it instead of reloading the page
  const goToServices = (event: MouseEvent) => {
    const grid = document.getElementById("stylegrid");

    close(false);

    if (!grid) return;

    event.preventDefault();
    grid.scrollIntoView({ behavior: "smooth" });
  };

  const currentSection =
    pathname === "/account" ? getCurrentSection(search) : "";

  const siteItems: NavMenuItem[] = [
    {
      kind: "link",
      key: "search",
      label: "Find a stylist",
      to: "/search",
      isCurrent: pathname === "/search",
      onClick: closeOnClick,
    },
    {
      kind: "link",
      key: "services",
      label: "Services",
      to: "/#stylegrid",
      onClick: goToServices,
    },
    { kind: "separator", key: "site-separator" },
  ];

  const helpItem: NavMenuItem = {
    kind: "link",
    key: "help",
    label: "Help & support",
    to: "/help",
    isCurrent: pathname === "/help",
    onClick: closeOnClick,
  };

  const accountItems: NavMenuItem[] = [
    ...ACCOUNT_SECTIONS.map(([section, label]): NavMenuItem => ({
      kind: "link",
      key: section,
      label,
      to: `/account?section=${section}`,
      dataTab: section,
      isCurrent: section === currentSection,
      onClick: (event) => {
        close(false);
        openAccountSection(event, section);
      },
    })),
    helpItem,
    { kind: "separator", key: "log-out-separator" },
    {
      kind: "button",
      key: "log-out",
      label: "Log out",
      onClick: (event) => {
        event.preventDefault();
        close(false);
        dispatch(logOut());
        navigate("/");
      },
    },
  ];

  const guestItems: NavMenuItem[] = [
    {
      kind: "link",
      key: "log-in",
      label: "Log in",
      to: loginHref,
      onClick: closeOnClick,
    },
    helpItem,
  ];

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setMenu((open) => (open ? null : { pinned: false }))}
        aria-label={isSignedIn ? "Account" : "Menu"}
        aria-haspopup="menu"
        aria-expanded="false"
        className={className}
      >
        {children}
      </button>
      {menu && buttonRef.current && (
        <NavMenu
          anchor={buttonRef.current}
          label={isSignedIn ? (identity?.name ?? "") : "Menu"}
          head={
            isSignedIn && (
              <NavMenuAccountHead
                name={identity?.name ?? ""}
                email={identity?.email ?? ""}
              />
            )
          }
          items={[
            ...siteItems,
            ...(isSignedIn ? accountItems : guestItems),
            ...extraItems,
          ]}
          pinned={menu.pinned}
          onClose={close}
        />
      )}
    </>
  );
};
