import type { ChangeEvent } from "react";
import { getDuplicateView } from "../../clients/view";
import { getAvatarSrc } from "../../core/format";
import { getAllClients } from "../../core/model";
import type { StudioClient } from "../../core/types";
import type { AddContext } from "./context";
import { BLANK_NEW_CLIENT } from "./types";
import type { NewClient } from "./types";
import { checkUnpaidFee } from "./unpaid-fee";

const isClientMatch = ({ name, phone, email }: StudioClient, query: string) =>
  !query ||
  name.toLowerCase().includes(query) ||
  (email || "").toLowerCase().includes(query) ||
  (phone || "").replace(/\s/g, "").includes(query.replace(/\s/g, ""));

export const getClientView = ({
  studio,
  state,
  setState,
  addNew,
  duplicate,
}: AddContext) => {
  const typed = (state.addClientQuery || "").trim();
  const query = typed.toLowerCase();

  const filtered = getAllClients(state).filter((item) =>
    isClientMatch(item, query),
  );

  const isNoMatch = !!query && filtered.length === 0;

  const pickClient = (id: string | null) => {
    setState({ addClient: id, addNew: null, addWalkIn: false, addStep: 2 });

    if (id) checkUnpaidFee(studio.context.getState, setState, id);
  };

  return {
    isWalkIn: !!state.addWalkIn,
    pickWalkIn: () =>
      setState({
        addWalkIn: true,
        addClient: null,
        addNew: null,
        addStep: 2,
        addUnpaidFee: null,
      }),
    clientQuery: state.addClientQuery,
    onClientQuery: (event: ChangeEvent<HTMLInputElement>) =>
      setState({ addClientQuery: event.target.value }),
    clients: filtered.map((item, index) => ({
      key: item.id ?? String(index),
      delay: `${(Math.min(index, 8) * 0.03 + 0.03).toFixed(2)}s`,
      name: item.name,
      imgSrc: getAvatarSrc(item),
      subtitle: item.phone || item.area || "",
      isOn: state.addClient === item.id,
      pick: () => pickClient(item.id),
    })),
    isNoMatch,
    newClient: addNew,
    duplicate: getDuplicateView(duplicate, "Book for {f} instead", (hit) =>
      pickClient(hit.id),
    ),
    newLabel: isNoMatch ? `Add “${typed}” as a new client` : "New client",
    toggleNew: () =>
      setState({
        addNew: addNew
          ? null
          : { ...BLANK_NEW_CLIENT, name: query ? typed : "" },
        addClient: null,
      }),
    patchNew: (patch: Partial<NewClient>) =>
      setState({ addNew: { ...(addNew ?? BLANK_NEW_CLIENT), ...patch } }),
    isAddressShown: !!state.profile.mobile,
  };
};
