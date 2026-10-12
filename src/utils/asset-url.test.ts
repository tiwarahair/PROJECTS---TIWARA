import { describe, expect, it } from "vitest";
import { getAssetUrl } from "./asset-url";

describe("getAssetUrl", () => {
  it("resolves prototype-relative image and logo paths", () => {
    expect(getAssetUrl("site/old-hero.jpg")).toContain("hero");
    expect(getAssetUrl("site/ceo.jpeg")).toContain("ceo");

    expect(getAssetUrl("logos/logo-crimson.png")).toContain("logo-crimson");
  });

  it("accepts a leading ./ like the prototype markup", () => {
    expect(getAssetUrl("./site/reveal.jpg")).toBe(
      getAssetUrl("site/reveal.jpg"),
    );
  });

  it("throws for an unknown asset", () => {
    expect(() => getAssetUrl("site/missing.jpg")).toThrow("Unknown asset");
  });
});
