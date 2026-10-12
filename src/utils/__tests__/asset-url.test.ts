import { describe, expect, it } from "vitest";
import { getAssetUrl } from "../asset-url";

describe("getAssetUrl", () => {
  it("resolves image and logo paths inside assets/", () => {
    expect(getAssetUrl("site/old-hero.jpg")).toContain("hero");
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
