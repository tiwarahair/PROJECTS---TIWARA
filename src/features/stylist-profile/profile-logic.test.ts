import { describe, expect, it } from "vitest";
import { stylists } from "../../data";
import {
  countServices,
  getGallery,
  getMenuGroups,
  getOpenStatus,
  getProfileFacts,
  getStylist,
  hasMoreServices,
  limitMenuGroups,
} from "./profile-logic";

// 2026-10-05 is a Monday (open 10:00–20:00); 2026-10-04 is a Sunday (closed)
const at = (date: string, time: string) => new Date(`${date}T${time}`);

describe("getOpenStatus", () => {
  it("open now: next slot is the hour after next, capped at the last hour", () => {
    expect(getOpenStatus(at("2026-10-05", "14:20"))).toEqual({
      isOpen: true,
      nextAvailable: "today from 16:00",
      openLabel: "Open now",
      openHours: "until 20:00",
    });

    expect(getOpenStatus(at("2026-10-05", "19:30")).nextAvailable).toBe(
      "today from 19:00",
    );
  });

  it("before opening it shows today's opening time", () => {
    expect(getOpenStatus(at("2026-10-05", "08:00"))).toMatchObject({
      isOpen: false,
      nextAvailable: "today 10:00",
      openLabel: "Closed",
      openHours: "opens 10:00",
    });
  });

  it("after closing, and on Sunday, it points at the next open day", () => {
    expect(getOpenStatus(at("2026-10-05", "21:00"))).toMatchObject({
      nextAvailable: "Tuesday 10:00",
      openHours: "opens Tuesday 10:00",
    });

    expect(getOpenStatus(at("2026-10-04", "12:00"))).toMatchObject({
      nextAvailable: "Monday 10:00",
      openHours: "opens Monday 10:00",
    });
  });
});

describe("service menu", () => {
  it("lists only the first six services across groups and counts the rest", () => {
    const groups = getMenuGroups(getStylist("tiwaras-house"));
    const limited = limitMenuGroups(groups);

    expect(countServices(limited)).toBe(Math.min(6, countServices(groups)));
    expect(hasMoreServices(groups)).toBe(countServices(groups) > 6);
    expect(limited.every(({ items }) => items.length > 0)).toBe(true);
  });

  it("rows link to booking with the service and carry the modal details", () => {
    const [group] = getMenuGroups(getStylist("tiwaras-house"));
    const [item] = group?.items ?? [];

    expect(item?.href).toMatch(/^\/book\?stylist=tiwaras-house&service=/);
    expect(item?.modal.price).toBe(`from ${item?.price}`);
  });
});

describe("profile facts", () => {
  it("unknown ids fall back to the first stylist", () => {
    expect(getStylist("nobody")).toBe(stylists[0]);
  });

  it("the gallery starts with the cover and has no duplicates", () => {
    const stylist = getStylist("tiwaras-house");
    const gallery = getGallery(stylist);

    expect(gallery[0]).toBe(stylist.cover);
    expect(new Set(gallery).size).toBe(gallery.length);
  });

  it("builds the policy chips and contact links", () => {
    const stylist = getStylist("tiwaras-house");
    const facts = getProfileFacts(stylist);

    expect(facts.cancelChip).toBe(
      `Free cancellation up to ${stylist.policies.freeWindowHours}h`,
    );

    expect(facts.hasPayChip).toBe(stylist.policies.mode !== "none");
    expect(facts.mailto).toBe("mailto:tiwarashouse@tiwarashouse.co.uk");
  });
});
