import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { Overlays, SimpleOverlayId } from "../types/overlays";
import type { ServiceId } from "../types/services";

const DEFAULT_STYLIST_NAME = "Tiwara's House";

export interface BookingSession {
  categoryKey: ServiceId;
  /** Set when opened from a stylist, which shortens the flow. */
  stylistId: string | null;
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
  searchStyle: ServiceId | "";
  searchLocation: string;
  bookingSession: BookingSession;
}

const ALL_CLOSED: Overlays = {
  search: false,
  profile: false,
  booking: false,
  aiDiscovery: false,
  otherStyle: false,
  hairQuiz: false,
  about: false,
  stylists: false,
  shop: false,
  sizeGuide: false,
};

const initialState: OverlaysState = {
  overlay: ALL_CLOSED,
  activeStylistId: null,
  searchStyle: "",
  searchLocation: "",
  bookingSession: {
    categoryKey: "braids",
    stylistId: null,
    stylistName: DEFAULT_STYLIST_NAME,
    sessionId: 0,
  },
};

export const overlaysSlice = createSlice({
  name: "overlays",
  initialState,
  reducers: {
    searchOpened(state, action: PayloadAction<ServiceId | "">) {
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
    searchStyleChanged(state, action: PayloadAction<ServiceId | "">) {
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
        categoryKey: ServiceId;
        stylistId?: string;
        stylistName?: string;
      }>,
    ) {
      const { categoryKey, stylistId, stylistName } = action.payload;
      if (stylistId !== undefined) state.activeStylistId = stylistId;
      state.bookingSession = {
        categoryKey,
        stylistId: stylistId ?? null,
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

    /**
     * The five full-page overlays added by the new-ui work are plain toggles
     * with no extra semantics, so they share one pair of actions rather than
     * ten near-identical reducers.
     */
    pageOpened(state, action: PayloadAction<SimpleOverlayId>) {
      state.overlay[action.payload] = true;
    },
    pageClosed(state, action: PayloadAction<SimpleOverlayId>) {
      state.overlay[action.payload] = false;
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
  pageOpened,
  pageClosed,
  aiDiscoveryOpened,
  aiDiscoveryClosed,
  sizeGuideOpened,
  sizeGuideClosed,
} = overlaysSlice.actions;

export const overlaysReducer = overlaysSlice.reducer;
