import { describe, expect, it } from "vitest";
import { SHOP_PRODUCTS, filterProducts } from "./shop-products";

describe("filterProducts", () => {
  it("shows every product for 'all'", () => {
    expect(filterProducts(SHOP_PRODUCTS, "all")).toHaveLength(
      SHOP_PRODUCTS.length,
    );
  });

  it("narrows to a single category", () => {
    expect(filterProducts(SHOP_PRODUCTS, "hair")).toHaveLength(3);
    expect(filterProducts(SHOP_PRODUCTS, "care")).toHaveLength(3);
    expect(filterProducts(SHOP_PRODUCTS, "accessories")).toHaveLength(2);
  });

  it("returns only products of the requested category", () => {
    for (const product of filterProducts(SHOP_PRODUCTS, "care")) {
      expect(product.category).toBe("care");
    }
  });

  it("covers every product across the three categories", () => {
    const counted =
      filterProducts(SHOP_PRODUCTS, "hair").length +
      filterProducts(SHOP_PRODUCTS, "care").length +
      filterProducts(SHOP_PRODUCTS, "accessories").length;
    expect(counted).toBe(SHOP_PRODUCTS.length);
  });
});
