import { describe, expect, it } from "vitest";
import { CLIENTS } from "../seed-clients";

describe("Studio seed clients", () => {
  it("client photos point at bundled assets, not raw img/ paths", () => {
    const photos = CLIENTS.map(({ img }) => img).filter(Boolean);

    expect(photos.length).toBeGreaterThan(0);
    photos.forEach((photo) => expect(photo).not.toMatch(/^img\//));
  });
});
