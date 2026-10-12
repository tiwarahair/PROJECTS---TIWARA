import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";

/** Toast action: a link (View), an undo that re-saves a favourite, or a label with no handler (board demo). */
interface ToastAction {
  label: string;
  href?: string;
  undoFavouriteId?: string;
}

export interface ToastMessage {
  id: number;
  message: string;
  action: ToastAction | null;
  /** Distance from the viewport bottom in px (default 24). */
  bottom: number;
  /** Pinned toasts never auto-dismiss (boards). */
  pinned: boolean;
}

interface ToastState {
  current: ToastMessage | null;
}

const initialState: ToastState = { current: null };
let nextToastId = 1;

export const toastSlice = createSlice({
  name: "toast",
  initialState,
  reducers: {
    showToast: {
      reducer: (state, { payload }: PayloadAction<ToastMessage>) => {
        state.current = payload;
      },
      prepare: (
        message: string,
        action: ToastAction | null = null,
        options: { bottom?: number; pinned?: boolean } = {},
      ) => ({
        payload: {
          id: nextToastId++,
          message,
          action,
          bottom: options.bottom ?? 24,
          pinned: !!options.pinned,
        },
      }),
    },
    clearToast: (state, { payload }: PayloadAction<number>) => {
      if (state.current?.id === payload) state.current = null;
    },
    /** A page unmounting takes its toast with it (a toast belongs to the page that raised it). */
    dismissToasts: (state) => {
      state.current = null;
    },
  },
});

export const { showToast, clearToast, dismissToasts } = toastSlice.actions;
