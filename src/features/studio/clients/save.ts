import { saveStylistClient } from "../../../lib/studio-api/clients";
import {
  removeClientPhoto,
  uploadClientPhoto,
} from "../../../lib/studio-api/photos";
import type { StudioContext } from "../core/actions";
import { getClientNames } from "../core/model";
import type { StudioClient, StudioPatch, StudioState } from "../core/types";

const renameClient = (
  state: StudioState,
  from: string,
  to: string,
  photoPath: string,
): Partial<StudioState> => ({
  extraClients: state.extraClients.map((client) =>
    client.id === from ? { ...client, id: to, photoPath } : client,
  ),
  bookings: state.bookings.map((booking) =>
    booking.client === from ? { ...booking, client: to } : booking,
  ),
  addClient: state.addClient === from ? to : state.addClient,
  clientAddresses: Object.fromEntries(
    Object.entries(state.clientAddresses).map(([id, address]) => [
      id === from ? to : id,
      address,
    ]),
  ),
  selectedClientId:
    state.selectedClientId === from ? to : state.selectedClientId,
});

/** A new photo (a data URL) is uploaded; "" removes it; undefined keeps the saved one. */
const getPhotoPath = async (
  stylistId: string,
  image: string | undefined,
  saved: string,
) => {
  if (image === undefined) return saved;

  if (!image.startsWith("data:")) return "";

  const blob = await (await fetch(image)).blob();

  return uploadClientPhoto(`${stylistId}/${crypto.randomUUID()}.jpg`, blob);
};

const toDetails = (client: StudioClient, photoPath: string) => ({
  ...getClientNames(client),
  phone: client.phone ?? "",
  email: client.email ?? "",
  photoPath,
  hairNotes: client.notes?.products ?? "",
});

/** Shows a new client straight away; a real account saves them and swaps in the id they're given. */
export const addStudioClient = (
  { setState, sync }: StudioContext,
  client: StudioClient,
  image?: string,
) => {
  const localId = client.id ?? "";

  setState(({ extraClients }) => ({
    extraClients: extraClients.concat([client]),
  }));

  sync?.save(
    async (stylistId) => {
      const photoPath = await getPhotoPath(stylistId, image, "");

      const id = await saveStylistClient(
        stylistId,
        null,
        toDetails(client, photoPath),
      );

      setState((state) => renameClient(state, localId, id, photoPath));
    },
    (state) => ({
      extraClients: state.extraClients.filter(({ id }) => id !== localId),
    }),
  );
};

/** Saves a real client's details, which the screen already shows. */
export const saveStudioClient = (
  { setState, sync }: StudioContext,
  client: StudioClient,
  image: string | undefined,
  revert: StudioPatch,
) =>
  sync?.save(async (stylistId) => {
    const photoPath = await getPhotoPath(
      stylistId,
      image,
      client.photoPath ?? "",
    );

    await saveStylistClient(stylistId, client.id, toDetails(client, photoPath));

    if (client.photoPath && client.photoPath !== photoPath)
      await removeClientPhoto(client.photoPath).catch(() => undefined);

    setState(({ clientOverrides }) => ({
      clientOverrides: {
        ...clientOverrides,
        [client.id ?? ""]: { ...clientOverrides[client.id ?? ""], photoPath },
      },
    }));
  }, revert);
