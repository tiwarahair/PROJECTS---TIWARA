import { useCallback } from "react";
import type { MouseEvent } from "react";
import { openLoginSheet, setFavourite } from "../stores/favourites-slice";
import { useAppDispatch, useAppSelector } from "../stores/hooks";
import { showToast } from "../stores/toast-slice";
import { prefersReducedMotion } from "../utils/page-flags";

export const FAVOURITES_HREF = "/account?section=favourites";

/** Heart "pop" on save. */
const popHeart = (element: Element) => {
  const svg = element.querySelector("svg") ?? element;

  if (prefersReducedMotion() || !svg.animate) return;

  svg.animate(
    [
      { transform: "scale(1)" },
      { transform: "scale(1.28)", offset: 0.4 },
      { transform: "scale(.94)", offset: 0.72 },
      { transform: "scale(1)" },
    ],
    { duration: 360, easing: "cubic-bezier(.2,.8,.2,1)" },
  );
};

/** Favourites: the one heart handler every heart calls. */
export const useFavourites = () => {
  const dispatch = useAppDispatch();
  const loggedIn = useAppSelector((state) => state.session.loggedIn);
  const favouriteIds = useAppSelector((state) => state.favourites.ids);

  const isFavourite = useCallback(
    (id: string) => favouriteIds.includes(id),
    [favouriteIds],
  );

  const toggleFavourite = useCallback(
    (id: string, event?: MouseEvent<HTMLElement>) => {
      event?.preventDefault();
      event?.stopPropagation();

      if (!loggedIn) {
        dispatch(openLoginSheet(id));

        return;
      }

      const isOn = !favouriteIds.includes(id);

      dispatch(setFavourite({ id, on: isOn }));

      if (event?.currentTarget && isOn) popHeart(event.currentTarget);

      if (isOn)
        dispatch(
          showToast("Saved to favourites", {
            label: "View",
            href: FAVOURITES_HREF,
          }),
        );
      else
        dispatch(
          showToast("Removed from favourites", {
            label: "Undo",
            undoFavouriteId: id,
          }),
        );
    },
    [dispatch, favouriteIds, loggedIn],
  );

  return { loggedIn, favouriteIds, isFavourite, toggleFavourite };
};
