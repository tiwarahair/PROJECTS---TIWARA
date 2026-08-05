import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

/**
 * The two surfaces that deliberately have no URL. Both are only reachable from
 * inside the booking flow, so a link to either would drop someone into a modal
 * floating over a wizard they never started. Everything else the user can
 * navigate to is addressed by the route instead.
 */
export type ModalId = "sizeGuide" | "otherStyle";

export type Modals = Record<ModalId, boolean>;

const initialState: Modals = { sizeGuide: false, otherStyle: false };

export const modalsSlice = createSlice({
  name: "modals",
  initialState,
  reducers: {
    modalOpened(state, action: PayloadAction<ModalId>) {
      state[action.payload] = true;
    },
    modalClosed(state, action: PayloadAction<ModalId>) {
      state[action.payload] = false;
    },
  },
});

export const { modalOpened, modalClosed } = modalsSlice.actions;

export const modalsReducer = modalsSlice.reducer;
