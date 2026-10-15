import { describe, expect, it } from "vitest";
import { getImageSources, toUploadVariant } from "../image-sources";

const ORIGINAL =
  "https://x.supabase.co/storage/v1/object/public/stylist-photos/s1/cover-1-full.jpg";

describe("image sources for uploads", () => {
  it("names each copy after the original", () => {
    expect(toUploadVariant("s1/portfolio/p1-full.jpg", 800, "webp")).toBe(
      "s1/portfolio/p1-800.webp",
    );
  });

  it("lists an upload's WebP and JPEG copies (no AVIF)", () => {
    const sources = getImageSources(ORIGINAL);

    expect(sources?.avif).toBeUndefined();

    expect(sources?.webp).toBe(
      ORIGINAL.replace("-full.jpg", "-400.webp 400w, ") +
        ORIGINAL.replace("-full.jpg", "-800.webp 800w, ") +
        ORIGINAL.replace("-full.jpg", "-1200.webp 1200w"),
    );

    expect(sources?.src).toBe(ORIGINAL);
  });

  it("has nothing for older uploads, previews and other URLs", () => {
    expect(getImageSources("https://x.supabase.co/.../cover-1.jpg")).toBeNull();
    expect(getImageSources("data:image/jpeg;base64,abc")).toBeNull();
  });
});
