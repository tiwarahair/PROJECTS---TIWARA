// Studio → Clients values: the list, the profile and the add / edit sheet.
import type { MouseEvent } from "react";
import type { StudioController } from "../../core/use-studio";
import { createClientActions } from "./actions";
import { getContext } from "./context";
import { getDraftView } from "./draft";
import { getListView } from "./list";
import { getProfileView } from "./profile";

export { getDuplicateView } from "./duplicate";
export type { DuplicateView } from "./duplicate";

const WARN = "#b5541f";

export const getClientsView = (studio: StudioController) => {
  const context = getContext(studio);
  const { state, isWide, isDesktop, selected } = context;
  const clientActions = createClientActions(context);

  return {
    isTable: isDesktop,
    isList: !selected || isWide,
    isProfile: !!selected && !isWide,
    isProfileSheet: state.sheet === "cliView" && !!selected,
    ...getListView(context, clientActions),
    ...getProfileView(context, clientActions),
    // add / edit sheet
    ...getDraftView(context),
    stop: (event: MouseEvent) => event.stopPropagation(),
    warn: WARN,
  };
};

export type ClientsView = ReturnType<typeof getClientsView>;
