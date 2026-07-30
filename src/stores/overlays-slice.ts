import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { Overlays } from "../types/overlays";
import type { ServiceCategoryKey } from "../types/domain";

const DEFAULT_STYLIST_NAME = "Tiwara's House";

export interface BookingSession {
  categoryKey: ServiceCategoryKey;
  stylistName: string;
  /** Bumped on every open so the wizard knows to run its reset. */
  sessionId: number;
}

export interface OverlaysState {
  overlay: Overlays;
  /**
   * The stylist whose context the user is in. NOT the same as "the profile is
   * open" — booking straight from a search card sets this without opening the
   * profile (old index.js:443).
   */
  activeStylistId: string | null;
  searchStyle: ServiceCategoryKey | "";
  searchLocation: string;
  bookingSession: BookingSession;
}

const ALL_CLOSED: Overlays = {
  search: false,
  profile: false,
  booking: false,
  aiDiscovery: false,
  sizeGuide: false,
  lengthGuide: false,
};

const initialState: OverlaysState = {
  overlay: ALL_CLOSED,
  activeStylistId: null,
  searchStyle: "",
  searchLocation: "",
  bookingSession: {
    categoryKey: "braids",
    stylistName: DEFAULT_STYLIST_NAME,
    sessionId: 0,
  },
};

export const overlaysSlice = createSlice({
  name: "overlays",
  initialState,
  reducers: {
    searchOpened(state, action: PayloadAction<ServiceCategoryKey | "">) {
      state.searchStyle = action.payload;
      // The location box is cleared on every open (old index.js:255).
      state.searchLocation = "";
      state.overlay.search = true;
    },
    searchClosed(state) {
      // Closing search also closes the profile and drops the active stylist —
      // extra semantics the other closers do not have (old index.js:264-269).
      state.overlay.search = false;
      state.overlay.profile = false;
      state.activeStylistId = null;
    },
    searchStyleChanged(state, action: PayloadAction<ServiceCategoryKey | "">) {
      state.searchStyle = action.payload;
    },
    searchLocationChanged(state, action: PayloadAction<string>) {
      state.searchLocation = action.payload;
    },

    profileOpened(state, action: PayloadAction<string>) {
      state.activeStylistId = action.payload;
      state.overlay.profile = true;
    },
    profileClosed(state) {
      state.overlay.profile = false;
      state.activeStylistId = null;
    },

    bookingOpened(
      state,
      action: PayloadAction<{
        categoryKey: ServiceCategoryKey;
        stylistId?: string;
        stylistName?: string;
      }>,
    ) {
      const { categoryKey, stylistId, stylistName } = action.payload;
      if (stylistId !== undefined) state.activeStylistId = stylistId;
      state.bookingSession = {
        categoryKey,
        // An AI-initiated booking passes no name, so whatever the previous
        // booking set survives (old index.js:449 only ran for stylist flows).
        stylistName: stylistName ?? state.bookingSession.stylistName,
        sessionId: state.bookingSession.sessionId + 1,
      };
      state.overlay.booking = true;
    },
    bookingClosed(state) {
      state.overlay.booking = false;
    },

    aiDiscoveryOpened(state) {
      state.overlay.aiDiscovery = true;
    },
    aiDiscoveryClosed(state) {
      state.overlay.aiDiscovery = false;
    },

    sizeGuideOpened(state) {
      state.overlay.sizeGuide = true;
    },
    sizeGuideClosed(state) {
      state.overlay.sizeGuide = false;
    },
    lengthGuideOpened(state) {
      state.overlay.lengthGuide = true;
    },
    lengthGuideClosed(state) {
      state.overlay.lengthGuide = false;
    },
  },
});

export const {
  searchOpened,
  searchClosed,
  searchStyleChanged,
  searchLocationChanged,
  profileOpened,
  profileClosed,
  bookingOpened,
  bookingClosed,
  aiDiscoveryOpened,
  aiDiscoveryClosed,
  sizeGuideOpened,
  sizeGuideClosed,
  lengthGuideOpened,
  lengthGuideClosed,
} = overlaysSlice.actions;

export const overlaysReducer = overlaysSlice.reducer;
