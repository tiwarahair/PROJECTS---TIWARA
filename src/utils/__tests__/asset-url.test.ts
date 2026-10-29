import { describe, expect, it } from "vitest";
import { getAssetImageSet, getAssetSources, getAssetUrl } from "../asset-url";

describe("getAssetUrl", () => {
  it("resolves image and logo paths inside assets/", () => {
    expect(getAssetUrl("site/hero.jpg")).toContain("hero");
    expect(getAssetUrl("site/ceo.jpeg")).toContain("ceo");

    expect(getAssetUrl("logos/logo-crimson.png")).toContain("logo-crimson");
  });

  it("accepts a leading ./", () => {
    expect(getAssetUrl("./site/hero.jpg")).toBe(getAssetUrl("site/hero.jpg"));
  });

  it("throws for an unknown asset", () => {
    expect(() => getAssetUrl("site/missing.jpg")).toThrow("Unknown asset");
  });
});

describe("getAssetSources", () => {
  it("lists the generated AVIF, WebP and JPEG copies at each width", () => {
    const sources = getAssetSources("site/hero.jpg");

    expect(sources?.avif).toMatch(
      /hero-640.*\.avif 640w, .*hero-1080.*\.avif 1080w, .*hero-1536.*\.avif 1536w/,
    );

    expect(sources?.webp).toContain("1080w");
    expect(sources?.fallback).toMatch(/hero-640.*\.jpg 640w/);
    expect(sources).toMatchObject({ width: 1536, height: 2304 });
  });

  it("is null for an image without copies", () => {
    expect(getAssetSources("logos/logo-crimson.png")).toBeNull();
  });
});

describe("getAssetImageSet", () => {
  it("picks the copy at or above the width, in all three formats", () => {
    const set = getAssetImageSet("site/problem.jpeg", 1000);

    expect(set?.imageSet).toMatch(
      /^image-set\(url\('.*problem-1080.*\.avif'\) type\("image\/avif"\), .*\.webp'\) type\("image\/webp"\), .*\.jpg'\) type\("image\/jpeg"\)\)$/,
    );
  });
});
