import { describe, expect, it, vi } from "vitest";
import { saveStylistClient } from "../../../../lib/studio-api/clients";
import { createStudioSync } from "../../core/sync";
import type { StudioClient, StudioPatch, StudioState } from "../../core/types";
import { addStudioClient, saveStudioClient } from "../save";

vi.mock("../../../../lib/studio-api/clients", () => ({
  saveStylistClient: vi.fn(),
}));

const client: StudioClient = {
  id: "c-local",
  name: "Bisi Phone",
  phone: "07700900777",
  email: "",
  area: "",
  img: "",
  visits: 0,
  last: "",
  spent: 0,
};

describe("a client added in Studio", () => {
  it("saves an edit made while still being added to the id the save returns, and keeps it on screen", async () => {
    let state = {
      extraClients: [],
      bookings: [],
      addClient: "c-local",
      clientAddresses: {},
      selectedClientId: null,
      clientOverrides: {},
    } as unknown as StudioState;

    const setState = (patch: StudioPatch) => {
      state = {
        ...state,
        ...(typeof patch === "function" ? patch(state) : patch),
      };
    };

    let finishCreate: (id: string) => void = () => undefined;

    vi.mocked(saveStylistClient)
      .mockImplementationOnce(
        () =>
          new Promise<string>((resolve) => {
            finishCreate = resolve;
          }),
      )
      .mockResolvedValueOnce("uuid-1");

    const context = {
      setState,
      sync: createStudioSync("stylist-1", setState, vi.fn()),
    };

    addStudioClient(context as never, client);

    // the email is added before the create has come back
    setState({ clientOverrides: { "c-local": { email: "bisi@example.com" } } });

    saveStudioClient(
      context as never,
      { ...client, email: "bisi@example.com" },
      undefined,
      {},
    );

    await vi.waitFor(() => expect(saveStylistClient).toHaveBeenCalledTimes(1));
    finishCreate("uuid-1");
    await vi.waitFor(() => expect(saveStylistClient).toHaveBeenCalledTimes(2));

    expect(vi.mocked(saveStylistClient).mock.calls[1]?.[1]).toBe("uuid-1");
    expect(state.addClient).toBe("uuid-1");

    expect(state.clientOverrides).toMatchObject({
      "uuid-1": { email: "bisi@example.com" },
    });
  });
});
