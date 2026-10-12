import { describe, expect, it } from "vitest";
import { getAssetUrl } from "./asset-url";

describe("getAssetUrl", () => {
  it("resolves prototype-relative image and logo paths", () => {
    expect(getAssetUrl("img/old-hero.jpg")).toContain("hero");
    expect(getAssetUrl("img/new/ceo.jpeg")).toContain("ceo");

    expect(getAssetUrl("logo-crimson.png")).toContain("logo-crimson");
  });

  it("accepts a leading ./ like the prototype markup", () => {
    expect(getAssetUrl("./img/reveal.jpg")).toBe(getAssetUrl("img/reveal.jpg"));
  });

  it("throws for an unknown asset", () => {
    expect(() => getAssetUrl("img/missing.jpg")).toThrow("Unknown asset");
  });
});
