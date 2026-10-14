import { describe, expect, it } from "vitest";
import { getPreviewHtml } from "../_link-preview-html";

const PROFILE = {
  slug: "tiwaras-house",
  business_name: "Tiwára's House",
  area_label: "Ancoats, Manchester",
  bio: "Protective styles that last.",
  cover_path: "stylist-1/cover.jpg",
};

describe("link previews", () => {
  it("describes a profile with its name, area, bio, cover and link", () => {
    const html = getPreviewHtml(
      "https://tiwarashouse.com",
      "https://abc.supabase.co",
      PROFILE,
    );

    expect(html).toContain(
      '<meta property="og:title" content="Tiwára&#39;s House · Tiwára’s House" />',
    );

    expect(html).toContain(
      'content="Ancoats, Manchester · Protective styles that last."',
    );

    expect(html).toContain(
      'content="https://abc.supabase.co/storage/v1/object/public/stylist-photos/stylist-1/cover.jpg"',
    );

    expect(html).toContain(
      '<meta property="og:url" content="https://tiwarashouse.com/tiwaras-house" />',
    );
  });

  it("escapes text and falls back to the site's own tags", () => {
    const html = getPreviewHtml("https://tiwarashouse.com", "", {
      ...PROFILE,
      business_name: '<script>"x"</script>',
      cover_path: null,
    });

    expect(html).not.toContain("<script>");
    expect(html).not.toContain("og:image");

    expect(getPreviewHtml("https://tiwarashouse.com", "", null)).toContain(
      "Find and book hair stylists near you.",
    );
  });
});
