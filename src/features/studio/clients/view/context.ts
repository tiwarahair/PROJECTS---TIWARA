import type { ChangeEvent } from "react";
import { getAllClients, getClient } from "../../core/model";
import type { StudioClient } from "../../core/types";
import type { StudioController } from "../../core/use-studio";
import { getClientStats } from "./stats";

export const getFirstName = ({ name }: StudioClient) =>
  name.split(" ")[0] ?? "";

export const readImage = (
  event: ChangeEvent<HTMLInputElement>,
  done: (url: string) => void,
) => {
  const file = event.target.files?.[0];

  event.target.value = "";

  if (!file) return;

  const reader = new FileReader();

  reader.onload = () => done(String(reader.result));
  reader.readAsDataURL(file);
};

export const getContext = (studio: StudioController) => {
  const { state, setState, isNew, seedPast } = studio;

  // new accounts have no seed clients, but anyone they add themselves still belongs in the list
  const all =
    isNew && !state.account
      ? state.extraClients
          .map(({ id }) => getClient(state, id))
          .filter(({ deleted }) => !deleted)
      : getAllClients(state);

  const setOverride = (id: string | null, patch: Partial<StudioClient>) =>
    setState(({ clientOverrides }) => ({
      clientOverrides: {
        ...clientOverrides,
        [id ?? ""]: { ...clientOverrides[id ?? ""], ...patch },
      },
    }));

  return {
    studio,
    state,
    setState,
    isWide: studio.isWide,
    isDesktop: studio.isDesktop,
    actions: studio.actions,
    all,
    // ---- the selected client's profile ----
    selected: state.selectedClientId
      ? (all.find(({ id }) => id === state.selectedClientId) ?? null)
      : null,
    setOverride,
    getStats: (id: string | null) => getClientStats(state, id, seedPast),
  };
};

export type ClientsContext = ReturnType<typeof getContext>;
