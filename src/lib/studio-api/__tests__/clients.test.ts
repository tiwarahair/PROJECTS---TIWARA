import { afterEach, describe, expect, it, vi } from "vitest";
import { getAccountPhotoUrls } from "../../account-photo";
import { supabase } from "../../supabase";
import { getClientRow } from "../../../test/studio-booking-row";
import { fetchStudioClients } from "../clients";
import { getClientPhotoUrls } from "../photos";

vi.mock("../photos", () => ({ getClientPhotoUrls: vi.fn() }));
vi.mock("../../account-photo", () => ({ getAccountPhotoUrls: vi.fn() }));

describe("the Studio client list", () => {
  afterEach(() => vi.restoreAllMocks());

  it("shows the stylist's own photo, else the client's account photo", async () => {
    vi.spyOn(supabase, "rpc").mockResolvedValue({
      data: [
        getClientRow({
          id: "own",
          photo_path: "s/own/1.jpg",
          account_photo_path: "a/photo.jpg",
        }),
        getClientRow({ id: "account", account_photo_path: "b/photo.jpg" }),
        getClientRow({ id: "none" }),
      ],
      error: null,
    } as unknown as Awaited<ReturnType<typeof supabase.rpc>>);

    vi.mocked(getClientPhotoUrls).mockResolvedValue(
      new Map([["s/own/1.jpg", "https://signed/own"]]),
    );

    vi.mocked(getAccountPhotoUrls).mockResolvedValue(
      new Map([["b/photo.jpg", "https://signed/account"]]),
    );

    const clients = await fetchStudioClients("stylist-1");

    expect(clients.map(({ id, photo_url: url }) => [id, url])).toEqual([
      ["own", "https://signed/own"],
      ["account", "https://signed/account"],
      ["none", ""],
    ]);

    expect(getAccountPhotoUrls).toHaveBeenCalledWith(["b/photo.jpg"]);
  });

  it("still lists clients when their account photos can't be signed", async () => {
    vi.spyOn(supabase, "rpc").mockResolvedValue({
      data: [
        getClientRow({ id: "account", account_photo_path: "b/photo.jpg" }),
      ],
      error: null,
    } as unknown as Awaited<ReturnType<typeof supabase.rpc>>);

    vi.mocked(getClientPhotoUrls).mockResolvedValue(new Map());
    vi.mocked(getAccountPhotoUrls).mockRejectedValue(new Error("storage down"));

    const clients = await fetchStudioClients("stylist-1");

    expect(clients.map(({ id, photo_url: url }) => [id, url])).toEqual([
      ["account", ""],
    ]);
  });
});
