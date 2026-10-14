import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "../link-preview";

const request = (slug: string) =>
  new Request(`https://tiwarashouse.com/api/link-preview?slug=${slug}`);

describe("the link-preview function", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("looks the profile up and returns its tags", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://abc.supabase.co");
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "public-key");

    const fetchProfile = vi.fn(async () =>
      Response.json({
        slug: "tiwaras-house",
        business_name: "Tiwára's House",
        area_label: "Ancoats, Manchester",
        bio: null,
        cover_path: null,
      }),
    );

    vi.stubGlobal("fetch", fetchProfile);

    const response = await GET(request("tiwaras-house"));

    expect(fetchProfile).toHaveBeenCalledWith(
      "https://abc.supabase.co/rest/v1/rpc/get_stylist_profile",
      expect.objectContaining({ body: '{"lookup":"tiwaras-house"}' }),
    );

    expect(await response.text()).toContain("Tiwára&#39;s House · ");
  });

  it("odd slugs never reach the database", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://abc.supabase.co");
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "public-key");
    const fetchProfile = vi.fn();

    vi.stubGlobal("fetch", fetchProfile);

    const response = await GET(request("..%2Fsecret"));

    expect(fetchProfile).not.toHaveBeenCalled();
    expect(await response.text()).toContain("Find and book hair stylists");
  });
});
