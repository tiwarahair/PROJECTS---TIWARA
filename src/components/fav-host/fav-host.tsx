import { useEffect } from "react";
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
import { ActionToast } from "../action-toast/action-toast";
import { FavLoginSheet } from "../fav-login-sheet/fav-login-sheet";

/**
 * Page-level host for the shared favourites and share behaviour,
 * rendered by Home, Search, Stylist Profile, Account and Help.
 */
export const FavHost = () => {
  const dispatch = useAppDispatch();
  const store = useAppStore();

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

    if (params.get("favsheet") === "1")
      later(() => dispatch(openLoginSheet("demo")), 500);

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      dispatch(dismissToasts());
    };
  }, [dispatch, store]);

  return (
    <>
      <ActionToast />
      <FavLoginSheet />
    </>
  );
};
