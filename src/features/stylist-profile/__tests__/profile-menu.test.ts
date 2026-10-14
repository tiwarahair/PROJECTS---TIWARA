import { describe, expect, it } from "vitest";
import { toPublicStylist } from "../../../lib/public-stylist";
import { PUBLIC_PROFILE } from "../../../test/public-profile";
import {
  countServices,
  getMenuGroups,
  hasMoreServices,
  limitMenuGroups,
} from "../profile-menu";

const { stylist } = toPublicStylist(PUBLIC_PROFILE);

describe("service menu", () => {
  it("lists only the first six services across groups and counts the rest", () => {
    const groups = getMenuGroups(stylist);
    const limited = limitMenuGroups(groups);

    expect(countServices(limited)).toBe(Math.min(6, countServices(groups)));
    expect(hasMoreServices(groups)).toBe(countServices(groups) > 6);
    expect(limited.every(({ items }) => items.length > 0)).toBe(true);
  });

  it("rows link to booking with the service and carry the modal details", () => {
    const [group] = getMenuGroups(stylist);
    const [item] = group?.items ?? [];

    expect(item?.href).toBe("/book?stylist=tiwaras-house&service=service-1");
    expect(item?.modal.price).toBe("from £132.45");
  });
});
