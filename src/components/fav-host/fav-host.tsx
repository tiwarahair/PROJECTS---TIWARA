import { useCallback, useEffect, useState } from "react";
import { FAVOURITES_HREF } from "../../hooks/use-favourites";
import {
  openLoginSheet,
  setFavourite,
  syncFavourites,
} from "../../stores/favourites-slice";
import { useAppDispatch, useAppStore } from "../../stores/hooks";
import { dismissToasts, showToast } from "../../stores/toast-slice";
import {
  getSearchParams,
  readSession,
  writeSession,
} from "../../utils/page-flags";
import { AccountMenu } from "../account-menu/account-menu";
import { ActionToast } from "../action-toast/action-toast";
import { FavLoginSheet } from "../fav-login-sheet/fav-login-sheet";

interface OpenMenu {
  anchor: HTMLElement;
  pinned: boolean;
}

/**
 * Page-level host for the shared favourites / share / account-menu behaviour,
 * rendered by Home, Search, Stylist Profile, Account.
 * Any element with data-tw-acct opens the account menu.
 */
export const FavHost = () => {
  const dispatch = useAppDispatch();
  const store = useAppStore();
  const [menu, setMenu] = useState<OpenMenu | null>(null);

  const closeMenu = useCallback((refocus: boolean) => {
    setMenu((open) => {
      if (open && refocus) open.anchor.focus();

      return null;
    });
  }, []);

  // page "load": sync session + favourites, then the boot behaviours
  useEffect(() => {
    dispatch(syncFavourites());
    const params = getSearchParams();
    const timers: number[] = [];

    const later = (callback: () => void, delay: number) =>
      timers.push(window.setTimeout(callback, delay));

    const pending = readSession("tw_fav_pending");

    if (pending && store.getState().session.loggedIn) {
      writeSession("tw_fav_pending", null);

      if (!store.getState().favourites.ids.includes(pending))
        dispatch(setFavourite({ id: pending, on: true }));

      later(
        () =>
          dispatch(
            showToast(
              "Saved to favourites",
              { label: "View", href: FAVOURITES_HREF },
              { bottom: 84 },
            ),
          ),
        700,
      );
    }

    const favouriteToast = params.get("favtoast");

    if (favouriteToast)
      later(() => {
        if (favouriteToast === "saved")
          dispatch(
            showToast(
              "Saved to favourites",
              { label: "View", href: FAVOURITES_HREF },
              { pinned: true },
            ),
          );
        else if (favouriteToast === "removed")
          dispatch(
            showToast(
              "Removed from favourites",
              { label: "Undo" },
              { pinned: true },
            ),
          );
        else if (favouriteToast === "copied")
          dispatch(showToast("Link copied", null, { pinned: true }));
      }, 500);

    if (params.get("acctmenu") === "1")
      later(() => {
        const anchor = [
          ...document.querySelectorAll<HTMLElement>("[data-tw-acct]"),
        ].find((element) => element.offsetParent !== null);

        if (anchor) setMenu({ anchor, pinned: true });
      }, 900);

    if (params.get("favsheet") === "1")
      later(() => dispatch(openLoginSheet("demo")), 500);

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      dispatch(dismissToasts());
    };
  }, [dispatch, store]);

  // any [data-tw-acct] trigger toggles the menu. Capture phase: it must run before a router <Link>'s own click
  // handler, which navigates unless the default is already prevented
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const anchor = (event.target as Element | null)?.closest?.<HTMLElement>(
        "[data-tw-acct]",
      );

      if (!anchor) return;

      event.preventDefault();
      setMenu((open) => (open ? null : { anchor, pinned: false }));
    };

    document.addEventListener("click", handleClick, true);

    return () => document.removeEventListener("click", handleClick, true);
  }, []);

  return (
    <>
      <ActionToast />
      <FavLoginSheet />
      {menu && (
        <AccountMenu
          anchor={menu.anchor}
          pinned={menu.pinned}
          onClose={closeMenu}
        />
      )}
    </>
  );
};
