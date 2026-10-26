// The stylist's clients: the list with their totals, and adding, editing, blocking and deleting them.
import { getAccountPhotoUrls } from "../account-photo";
import { supabase } from "../supabase";
import { getClientPhotoUrls } from "./photos";
import { check, writeOrRefuse } from "./request";

const REFUSALS: Record<string, string> = {
  contact_required: "Add a phone number or an email for the client.",
  invalid_phone: "That phone number isn’t a UK mobile.",
  invalid_email: "That email address doesn’t look right.",
  duplicate_email: "Another client already uses that email.",
  has_upcoming: "Cancel their upcoming bookings first.",
  unpaid_fee: "Settle their fee first.",
  recent_payment: "Clients who paid in the last 120 days can’t be deleted yet.",
  email_required:
    "They have a booking waiting for them to confirm by email. Keep an email until it’s confirmed, or cancel it.",
};

export const fetchStudioClients = async (stylistId: string) => {
  const rows =
    (await check(
      supabase.rpc("get_studio_clients", { target_stylist: stylistId }),
    )) ?? [];

  // a client's own account photo stands in where the stylist hasn't taken one
  const [photos, accountPhotos] = await Promise.all([
    getClientPhotoUrls(
      rows.flatMap(({ photo_path: path }) => (path ? [path] : [])),
    ),
    // these are only a stand-in, so a failure shows initials rather than stopping the list
    getAccountPhotoUrls(
      rows.flatMap(({ photo_path: path, account_photo_path: accountPath }) =>
        !path && accountPath ? [accountPath] : [],
      ),
    ).catch(() => new Map<string, string>()),
  ]);

  return rows.map((row) => ({
    ...row,
    photo_url:
      (row.photo_path && photos.get(row.photo_path)) ||
      (row.account_photo_path && accountPhotos.get(row.account_photo_path)) ||
      "",
  }));
};

export type StudioClientRow = Awaited<
  ReturnType<typeof fetchStudioClients>
>[number];

export interface ClientDetails {
  first: string;
  last: string;
  phone: string;
  email: string;
  photoPath: string;
  hairNotes: string;
}

/** Adds a client (no `id`) or saves their details; returns their id. */
export const saveStylistClient = async (
  stylistId: string,
  id: string | null,
  { first, last, phone, email, photoPath, hairNotes }: ClientDetails,
) =>
  (await writeOrRefuse(
    supabase.rpc("save_stylist_client", {
      target_stylist: stylistId,
      ...(id ? { target: id } : {}),
      details: {
        first,
        last,
        phone,
        email,
        photo_path: photoPath,
        hair_notes: hairNotes,
      },
    }),
    REFUSALS,
  )) ?? "";

export const setClientBlocked = (id: string, isBlocked: boolean) =>
  writeOrRefuse(
    supabase.rpc("set_client_blocked", { target: id, blocked: isBlocked }),
    REFUSALS,
  );

export const deleteStylistClient = (id: string) =>
  writeOrRefuse(
    supabase.rpc("delete_stylist_client", { target: id }),
    REFUSALS,
  );
