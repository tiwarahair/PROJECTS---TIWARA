import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "../calendar";

const SECRET = "a".repeat(48);

const request = (key: string, feed = "client") =>
  new Request(`https://tiwarashouse.com/api/calendar?feed=${feed}&key=${key}`);

describe("the calendar function", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("passes the feed through from Supabase", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://abc.supabase.co");

    const fetchFeed = vi.fn(
      async () =>
        new Response("BEGIN:VCALENDAR", {
          headers: { "content-type": "text/calendar; charset=utf-8" },
        }),
    );

    vi.stubGlobal("fetch", fetchFeed);

    const response = await GET(request(SECRET));

    expect(fetchFeed).toHaveBeenCalledWith(
      `https://abc.supabase.co/functions/v1/client-calendar?key=${SECRET}`,
    );

    expect(response.headers.get("Content-Type")).toBe(
      "text/calendar; charset=utf-8",
    );

    expect(await response.text()).toBe("BEGIN:VCALENDAR");
  });

  it("passes a stylist's feed through from their own function", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://abc.supabase.co");
    const fetchFeed = vi.fn(async () => new Response("BEGIN:VCALENDAR"));
    const key = "Ab_-".repeat(8);

    vi.stubGlobal("fetch", fetchFeed);

    await GET(request(key, "studio"));

    expect(fetchFeed).toHaveBeenCalledWith(
      `https://abc.supabase.co/functions/v1/stylist-calendar?key=${key}`,
    );
  });

  it("an outage says try again rather than that the link is gone", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://abc.supabase.co");
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.reject(new Error("down"))),
    );

    const response = await GET(request(SECRET));

    expect(response.status).toBe(503);
  });

  it("odd secrets never reach Supabase", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://abc.supabase.co");
    const fetchFeed = vi.fn();

    vi.stubGlobal("fetch", fetchFeed);

    const response = await GET(request("not-a-secret"));

    expect(fetchFeed).not.toHaveBeenCalled();
    expect(response.status).toBe(404);
  });
});
