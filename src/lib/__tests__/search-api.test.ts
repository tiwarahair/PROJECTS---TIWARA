import { afterEach, describe, expect, it, vi } from "vitest";
import { searchStylists } from "../search-api";
import { publicSupabase, supabase } from "../supabase";

describe("searchStylists", () => {
  afterEach(() => vi.restoreAllMocks());

  it("uses the client without a login, so it never waits on a session refresh", async () => {
    const publicRpc = vi
      .spyOn(publicSupabase, "rpc")
      .mockResolvedValue({ data: [], error: null } as never);

    const sessionRpc = vi.spyOn(supabase, "rpc");

    await searchStylists({ sort: "newest" }, 1, 8);

    expect(publicRpc).toHaveBeenCalledWith("search_stylists", {
      sort: "newest",
      page: 1,
      page_size: 8,
    });

    expect(sessionRpc).not.toHaveBeenCalled();
  });
});
