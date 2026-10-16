import { CLIENTS } from "../seed-clients";
import type { StudioClient, StudioState } from "../types";

const WALK_IN: StudioClient = {
  id: null,
  walkIn: true,
  name: "Walk-in",
  first: "this client",
  img: "",
  area: "",
  visits: 0,
  since: "",
  spent: 0,
  phone: "",
  email: "",
};

/** A client with any Studio edits applied; null is a walk-in. */
export const getClient = (
  state: StudioState,
  id: string | null | undefined,
): StudioClient => {
  if (id === null) return WALK_IN;

  const base =
    CLIENTS.find((client) => client.id === id) ??
    state.extraClients.find((client) => client.id === id) ??
    (CLIENTS[0] as StudioClient);

  const override = state.clientOverrides[base.id ?? ""];
  const client = override ? { ...base, ...override } : base;

  if (client.deleted)
    return {
      ...client,
      name: "Deleted client",
      first: "Deleted client",
      img: "",
      phone: "",
      email: "",
      address: "",
      area: "",
      notes: null,
      sensitivities: "",
      fav: "",
    };

  const address = state.clientAddresses[client.id ?? ""];

  return address ? { ...client, address } : client;
};

export const getAllClients = (state: StudioState): StudioClient[] =>
  CLIENTS.concat(state.extraClients)
    .map(({ id }) => getClient(state, id))
    .filter(({ deleted }) => !deleted);

const normalisePhone = (phone: string | null | undefined): string => {
  let digits = String(phone || "").replace(/\D/g, "");

  if (digits.startsWith("44")) digits = `0${digits.slice(2)}`;

  return digits;
};

const normaliseEmail = (email: string | null | undefined): string =>
  String(email || "")
    .trim()
    .toLowerCase();

export interface DuplicateHit {
  client: StudioClient;
  field: "phone" | "email";
}

/** Another client already using this phone or email. */
export const findDuplicate = (
  state: StudioState,
  phone: string | null | undefined,
  email: string | null | undefined,
  exceptId: string | null,
): DuplicateHit | null => {
  const normalised = normalisePhone(phone);
  const address = normaliseEmail(email);
  const hasPhone = normalised.length >= 10;
  const hasEmail = address.includes("@");

  if (!hasPhone && !hasEmail) return null;

  for (const client of getAllClients(state)) {
    if (client.id === exceptId) continue;

    if (hasPhone && normalisePhone(client.phone) === normalised)
      return { client, field: "phone" };

    if (hasEmail && normaliseEmail(client.email) === address)
      return { client, field: "email" };
  }

  return null;
};
