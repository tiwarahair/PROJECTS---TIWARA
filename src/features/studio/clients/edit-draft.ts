import type { ClientEditDraft, StudioClient } from "../core/types";

/** The add / edit client sheet's fields, filled from a client (or empty for a new one). */
export const toEditDraft = (client: StudioClient | null): ClientEditDraft => {
  const notes = client?.notes || {};
  const [first = "", ...rest] = client ? client.name.split(" ") : [""];

  return {
    id: client ? client.id : null,
    first,
    last: rest.join(" "),
    phone: client?.phone || "",
    email: client?.email || "",
    type: notes.type || "",
    size: notes.size || "",
    length: notes.length || "",
    products: notes.products || "",
  };
};
