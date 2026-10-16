import type { ChangeEvent } from "react";
import { findDuplicate, getClient } from "../../core/model";
import type { StudioClient, StudioState } from "../../core/types";
import { readImage } from "./context";
import type { ClientsContext } from "./context";
import { getDuplicateView } from "./duplicate";

type ClientDraft = NonNullable<StudioState["clientEdit"]>;

const getDraftData = (draft: ClientDraft) => {
  const data: Partial<StudioClient> & { name: string } = {
    name: [(draft.first || "").trim(), (draft.last || "").trim()]
      .filter(Boolean)
      .join(" "),
    phone: (draft.phone || "").trim(),
    email: (draft.email || "").trim(),
    sensitivities: (draft.sensitivities || "").trim(),
    notes: { products: (draft.products || "").trim() },
  };

  if (draft.img !== undefined) data.img = draft.img;

  return data;
};

export const getDraftView = ({
  state,
  setState,
  isWide,
  actions,
  setOverride,
}: ClientsContext) => {
  const { openSheet, showToast, closeSheet, scrollBody } = actions;
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

  const showAdded = (id: string) => {
    if (isWide) {
      setState({ tab: "clients" });

      openSheet("cliView", {
        selectedClientId: id,
        clientAppointmentsTab: "up",
      });

      return;
    }

    setState({
      tab: "clients",
      selectedClientId: id,
      clientAppointmentsTab: "up",
    });

    scrollBody(0, false);
  };

  const saveDraft = () => {
    if (!draft || duplicate) return;

    const data = getDraftData(draft);

    if (draft.id) {
      setOverride(draft.id, data);

      if (state.clientEditFromView)
        openSheet("cliView", { selectedClientId: draft.id });
      else closeSheet();

      showToast("Changes saved");

      return;
    }

    const id = `c${Date.now()}`;

    setState({
      extraClients: state.extraClients.concat([
        {
          id,
          area: "",
          img: "",
          visits: 0,
          last: "",
          spent: 0,
          since: "Sep 2026",
          ...data,
        },
      ]),
    });

    closeSheet();
    window.setTimeout(() => showAdded(id), 220);
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
    saveDraft,
    cancelDraft: () => {
      if (state.clientEditFromView)
        openSheet("cliView", { selectedClientId: draft?.id ?? null });
      else closeSheet();
    },
  };
};
