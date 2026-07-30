import { useMemo } from "react";
import { useAppDispatch } from "../stores/hooks";
import {
  aiDiscoveryOpened,
  bookingOpened,
  profileOpened,
  searchOpened,
} from "../stores/overlays-slice";
import type { ServiceCategoryKey } from "../types/domain";

export interface OverlayActions {
  openSearch: (style?: ServiceCategoryKey | "") => void;
  openProfile: (stylistId: string) => void;
  openBooking: (categoryKey: ServiceCategoryKey, stylistName?: string) => void;
  openAiDiscovery: () => void;
}

/**
 * The overlay-opening actions, which are needed by scattered leaf components
 * across every landing section. Dispatching from the leaf avoids threading
 * four callbacks down three levels of markup.
 */
export function useOverlayActions(): OverlayActions {
  const dispatch = useAppDispatch();

  return useMemo(
    () => ({
      openSearch: (style = "") => dispatch(searchOpened(style)),
      openProfile: (stylistId) => dispatch(profileOpened(stylistId)),
      openBooking: (categoryKey, stylistName) =>
        dispatch(bookingOpened({ categoryKey, stylistName })),
      openAiDiscovery: () => dispatch(aiDiscoveryOpened()),
    }),
    [dispatch],
  );
}
