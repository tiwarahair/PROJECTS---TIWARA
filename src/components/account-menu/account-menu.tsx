import { useLocation, useNavigate } from "react-router";
import { useAppDispatch } from "../../stores/hooks";
import { useIdentity } from "../../hooks/use-identity";
import { logOut } from "../../stores/session-slice";
import { NavMenu, NavMenuAccountHead } from "../nav-menu/nav-menu";
import type { NavMenuItem } from "../nav-menu/nav-menu";

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

/** The header account menu: name, account sections, Log out. */
export const AccountMenu = ({ anchor, pinned, onClose }: AccountMenuProps) => {
  const identity = useIdentity();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const onAccountPage = pathname === "/account";
  const params = new URLSearchParams(search);
  const tabParam = params.get("tab");

  const currentTab =
    params.get("section") ||
    (tabParam ? LEGACY_TABS[tabParam] || tabParam : "") ||
    "";

  const items: NavMenuItem[] = [
    ...MENU_ITEMS.map(({ tab, label, href }): NavMenuItem => ({
      kind: "link",
      key: tab,
      label,
      to: href,
      dataTab: tab,
      isCurrent: onAccountPage && tab === currentTab,
      onClick: (event) => {
        // on the account page the menu switches tabs in place instead of navigating
        if (onAccountPage && tab !== "help") {
          event.preventDefault();
          onClose(false);

          window.dispatchEvent(
            new CustomEvent(ACCOUNT_TAB_EVENT, { detail: tab }),
          );
        }
      },
    })),
    { kind: "separator", key: "separator" },
    {
      kind: "button",
      key: "log-out",
      label: "Log out",
      onClick: (event) => {
        event.preventDefault();
        onClose(false);
        dispatch(logOut());
        navigate("/");
      },
    },
  ];

  return (
    <NavMenu
      anchor={anchor}
      label={identity?.name ?? ""}
      head={
        <NavMenuAccountHead
          name={identity?.name ?? ""}
          email={identity?.email ?? ""}
        />
      }
      items={items}
      pinned={pinned}
      onClose={onClose}
    />
  );
};
