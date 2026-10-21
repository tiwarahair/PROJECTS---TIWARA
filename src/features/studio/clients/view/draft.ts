import type { ChangeEvent } from "react";
import {
  findDuplicate,
  getClient,
  isDuplicateBlocking,
} from "../../core/model";
import type { StudioClient, StudioState } from "../../core/types";
import { readImage } from "./context";
import type { ClientsContext } from "./context";
import { getDuplicateView } from "./duplicate";
import { addStudioClient, saveStudioClient } from "../save";

type ClientDraft = NonNullable<StudioState["clientEdit"]>;

const getDraftData = (draft: ClientDraft) => {
  const data: Partial<StudioClient> & { name: string } = {
    name: [(draft.first || "").trim(), (draft.last || "").trim()]
      .filter(Boolean)
      .join(" "),
    first: (draft.first || "").trim(),
    phone: (draft.phone || "").trim(),
    email: (draft.email || "").trim(),
    notes: { products: (draft.products || "").trim() },
  };

  if (draft.img !== undefined) data.img = draft.img;

  return data;
};

export const getDraftView = ({
  studio,
  state,
  setState,
  isWide,
  actions,
  setOverride,
}: ClientsContext) => {
  const {
    openSheet,
    showToast,
    closeSheet,
    scrollBody,
    leaveClientEdit,
    isEditFromBooking,
  } = actions;

  // ---- the add / edit client sheet ----
  const draft = state.clientEdit;

  const patchDraft = (patch: Partial<ClientDraft>) =>
    setState(({ clientEdit }) => ({
      clientEdit: clientEdit ? { ...clientEdit, ...patch } : clientEdit,
    }));

  const duplicate =
    state.sheet === "clientEdit" && draft
      ? findDuplicate(state, draft.phone, draft.email, draft.id)
      : null;

  // clientEdit.img: undefined = untouched (use the client's saved photo), '' = removed, data URL = new pick
  const savedImage = draft?.id ? getClient(state, draft.id).img || "" : "";

  const showAdded = () => {
    if (isWide) {
      setState({ tab: "clients" });
      openSheet("cliView", { clientAppointmentsTab: "up" });

      return;
    }

    setState({ tab: "clients", clientAppointmentsTab: "up" });
    scrollBody(0, false);
  };

  const saveDraft = () => {
    if (!draft || isDuplicateBlocking(duplicate)) return;

    const data = getDraftData(draft);

    if (draft.id) {
      const previous = studio.context.getState().clientOverrides;

      setOverride(draft.id, data);

      saveStudioClient(
        studio.context,
        { ...getClient(state, draft.id), ...data },
        draft.img,
        { clientOverrides: previous },
      );

      const isFromBooking = isEditFromBooking();

      if (isFromBooking) leaveClientEdit(true);
      else if (state.clientEditFromView)
        openSheet("cliView", { selectedClientId: draft.id });
      else closeSheet();

      showToast(isFromBooking && data.email ? "Email added" : "Changes saved");

      return;
    }

    const id = `c${Date.now()}`;

    addStudioClient(
      studio.context,
      {
        id,
        area: "",
        img: "",
        visits: 0,
        last: "",
        spent: 0,
        since: new Date().toLocaleDateString("en-GB", {
          month: "short",
          year: "numeric",
        }),
        ...data,
      },
      draft.img,
    );

    setState({ selectedClientId: id });
    closeSheet();
    window.setTimeout(showAdded, 220);
    showToast(`${(draft.first || "").trim()} added`);
  };

  return {
    draft,
    patchDraft,
    draftImage: draft?.img !== undefined ? draft.img : savedImage,
    onDraftImage: (event: ChangeEvent<HTMLInputElement>) =>
      readImage(event, (url) => patchDraft({ img: url })),
    duplicate: getDuplicateView(duplicate, "View {f}", (client) =>
      openSheet("cliView", { selectedClientId: client.id }),
    ),
    saveLabel: draft?.id ? "Save changes" : "Add client",
    isEmailFocused: state.clientEditFocus === "email",
    saveDraft,
    cancelDraft: () => {
      if (isEditFromBooking()) leaveClientEdit();
      else if (state.clientEditFromView)
        openSheet("cliView", { selectedClientId: draft?.id ?? null });
      else closeSheet();
    },
  };
};
