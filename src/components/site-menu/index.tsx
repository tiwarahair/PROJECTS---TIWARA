import { useCallback, useRef, useState } from "react";
import type { MouseEvent, ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { useLocation } from "react-router";
import { useIdentity } from "../../hooks/use-identity";
import { useMediaQuery } from "../../hooks/use-media-query";
import { STUDIO_ADMIN_URL } from "../../features/admin/shell/nav-items";
import { useSignOut } from "../../hooks/use-sign-out";
import { AccountPhoto } from "../account-photo";
import { NavMenu, NavMenuAccountHead } from "../nav-menu";
import type { NavMenuItem } from "../nav-menu";
import styles from "../../styles/components/site-menu/index.module.css";

export const ACCOUNT_TAB_EVENT = "tw-acct-tab";

/** The site header shows its nav links from 761px. */
const MOBILE_UP_TO = 760;

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
  hasChevron?: boolean;
  /** Replaces the default avatar circle style. */
  className?: string;
}

/** The account trigger's contents: the photo (or initials), and a chevron. */
export const AccountAvatar = ({
  initials,
  hasChevron = true,
  className = styles.avatar,
}: AccountAvatarProps) => {
  return (
    <>
      <span aria-hidden="true" className={className}>
        <AccountPhoto initials={initials} />
      </span>
      {hasChevron && <ChevronDown size={14} strokeWidth={1.7} />}
    </>
  );
};

interface SiteMenuProps {
  isSignedIn: boolean;
  loginHref?: string;
  /** The trigger button's class; defaults to the avatar-and-chevron button. */
  className?: string;
  /** The trigger's contents: an AccountAvatar when signed in, burger lines when not. */
  children: ReactNode;
  /** From this width the page's own nav shows Find a stylist and Services, so the menu leaves them out. */
  linksShownFrom?: number;
}

/**
 * The site menu: a trigger button and the pop-up menu it opens, the same on every page.
 * Site links, then the account sections and Log out, or Log in and Help & support for guests.
 */
export const SiteMenu = ({
  isSignedIn,
  loginHref = "/login",
  className = styles.accountButton,
  children,
  linksShownFrom,
}: SiteMenuProps) => {
  const identity = useIdentity();
  const signOut = useSignOut();
  const { pathname, search } = useLocation();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [isOpen, setOpen] = useState(false);

  const isWide = useMediaQuery(
    `(min-width: ${linksShownFrom ?? MOBILE_UP_TO + 1}px)`,
  );

  const close = useCallback((refocus: boolean) => {
    setOpen(false);

    if (refocus) buttonRef.current?.focus();
  }, []);

  const closeOnClick = () => close(false);

  // on the home page, scroll to the section instead of reloading the page
  const goToSection = (id: string) => (event: MouseEvent) => {
    const section = document.getElementById(id);

    close(false);

    if (!section) return;

    event.preventDefault();
    section.scrollIntoView({ behavior: "smooth" });
  };

  const getSectionItem = (id: string, label: string): NavMenuItem => ({
    kind: "link",
    key: id,
    label,
    to: `/#${id}`,
    onClick: goToSection(id),
  });

  const currentSection =
    pathname === "/account" ? getCurrentSection(search) : "";

  const navItems: NavMenuItem[] =
    isWide && linksShownFrom
      ? []
      : [
          {
            kind: "link",
            key: "search",
            label: "Find a stylist",
            to: "/search",
            isCurrent: pathname === "/search",
            onClick: closeOnClick,
          },
          getSectionItem("stylegrid", "Services"),
        ];

  const siteItems: NavMenuItem[] = [
    ...navItems,
    ...(isWide
      ? []
      : [
          getSectionItem("stylists", "About"),
          getSectionItem("for-stylists", "For stylists"),
        ]),
  ];

  const studioItem: NavMenuItem[] = identity?.user.isStylist
    ? [
        {
          kind: "link",
          key: "studio",
          label: "Studio",
          to: "/studio",
          isCurrent: pathname === "/studio",
          onClick: closeOnClick,
        },
      ]
    : [];

  const adminItem: NavMenuItem[] = identity?.user.isAdmin
    ? [
        {
          kind: "link",
          key: "admin",
          label: "Admin",
          to: pathname === "/studio" ? STUDIO_ADMIN_URL : "/admin",
          isCurrent: pathname === "/admin",
          onClick: closeOnClick,
        },
      ]
    : [];

  const helpItem: NavMenuItem = {
    kind: "link",
    key: "help",
    label: "Help & support",
    to: "/help",
    isCurrent: pathname === "/help",
    onClick: closeOnClick,
  };

  const accountItems: NavMenuItem[] = [
    ...studioItem,
    ...adminItem,
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
        signOut();
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
        onClick={() => setOpen((open) => !open)}
        aria-label={isSignedIn ? "Account" : "Menu"}
        aria-haspopup="menu"
        aria-expanded="false"
        className={className}
      >
        {children}
      </button>
      {isOpen && buttonRef.current && (
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
            ...(siteItems.length
              ? [{ kind: "separator", key: "site-separator" } as const]
              : []),
            ...(isSignedIn ? accountItems : guestItems),
          ]}
          onClose={close}
        />
      )}
    </>
  );
};
