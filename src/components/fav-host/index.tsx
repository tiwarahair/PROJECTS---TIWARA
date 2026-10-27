import { useEffect } from "react";
import { FAVOURITES_HREF } from "../../hooks/use-favourites";
import { loadFavourites, saveFavourite } from "../../stores/favourites-slice";
import {
  useAppDispatch,
  useAppSelector,
  useAppStore,
} from "../../stores/hooks";
import { dismissToasts, showToast } from "../../stores/toast-slice";
import { readSession, writeSession } from "../../utils/page-flags";
import { ActionToast } from "../action-toast";
import { FavLoginSheet } from "../fav-login-sheet";

/**
 * Page-level host for the shared favourites and share behaviour,
 * rendered by Home, Search, Stylist Profile, Account and Help.
 */
export const FavHost = () => {
  const dispatch = useAppDispatch();
  const store = useAppStore();
  const userId = useAppSelector(({ session }) => session.user?.id);

  // page "load": the account's favourites, then a heart tapped before logging in
  useEffect(() => {
    const timers: number[] = [];
    let isActive = true;

    const later = (callback: () => void, delay: number) =>
      timers.push(window.setTimeout(callback, delay));

    if (userId) {
      const pending = readSession("tw_fav_pending");

      writeSession("tw_fav_pending", null);

      void dispatch(loadFavourites(userId)).then(() => {
        if (!isActive || !pending) return;

        if (!store.getState().favourites.ids.includes(pending))
          void dispatch(saveFavourite({ id: pending, on: true }));

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
      });
    }

    return () => {
      isActive = false;
      timers.forEach((timer) => window.clearTimeout(timer));
      dispatch(dismissToasts());
    };
  }, [dispatch, store, userId]);

  return (
    <>
      <ActionToast />
      <FavLoginSheet />
    </>
  );
};
