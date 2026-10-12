import { describe, expect, it } from "vitest";
import { CLIENTS } from "./studio-data";

describe("Studio seed clients", () => {
  it("photos point at bundled assets, not prototype-relative paths", () => {
    const photos = CLIENTS.map(({ img }) => img).filter(Boolean);

    expect(photos.length).toBeGreaterThan(0);
    photos.forEach((photo) => expect(photo).not.toMatch(/^img\//));
  });
});
