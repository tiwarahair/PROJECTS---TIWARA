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

  const base = CLIENTS.concat(state.extraClients, state.bookingClients).find(
    (client) => client.id === id,
  ) ?? { id: id ?? "", name: "Client", first: "Client" };

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

/** First and last name, keeping a first name with a space ("Mary Jane") whole when it's known. */
export const getClientNames = ({ name, first }: StudioClient) => {
  const full = name.trim();
  const firstName = first?.trim() || (full.split(/\s+/)[0] ?? "");

  return {
    first: firstName,
    last: full.startsWith(firstName) ? full.slice(firstName.length).trim() : "",
  };
};

export const getAllClients = (state: StudioState): StudioClient[] =>
  (state.account ? state.bookingClients : CLIENTS)
    .concat(state.extraClients)
    .filter(
      (client, index, all) =>
        all.findIndex(({ id }) => id === client.id) === index,
    )
    .map(({ id }) => getClient(state, id))
    .filter(({ deleted }) => !deleted);

const normalisePhone = (phone: string | null | undefined): string => {
  const digits = String(phone || "").replace(/\D/g, "");

  if (/^(44)?0?7\d{9}$/.test(digits)) return `0${digits.slice(-10)}`;

  return digits.replace(/^44/, "0");
};

const normaliseEmail = (email: string | null | undefined): string =>
  String(email || "")
    .trim()
    .toLowerCase();

export interface DuplicateHit {
  client: StudioClient;
  field: "phone" | "email";
}

/** Another client already using this email or, failing that, this phone*/
export const findDuplicate = (
  state: StudioState,
  phone: string | null | undefined,
  email: string | null | undefined,
  exceptId: string | null,
): DuplicateHit | null => {
  const normalised = normalisePhone(phone);
  const address = normaliseEmail(email);
  const others = getAllClients(state).filter(({ id }) => id !== exceptId);

  const byEmail = address.includes("@")
    ? others.find((client) => normaliseEmail(client.email) === address)
    : undefined;

  const byPhone =
    normalised.length >= 10
      ? others.find((client) => normalisePhone(client.phone) === normalised)
      : undefined;

  if (byEmail) return { client: byEmail, field: "email" };

  return byPhone ? { client: byPhone, field: "phone" } : null;
};

/** Only a shared email stops a client being saved. */
export const isDuplicateBlocking = (hit: DuplicateHit | null) =>
  hit?.field === "email";
