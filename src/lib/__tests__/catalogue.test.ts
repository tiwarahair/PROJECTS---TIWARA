import { describe, expect, it } from "vitest";
import { toCatalogue } from "../catalogue";

const GROUP = {
  id: "braids",
  name: "Braids & Twists",
  icon: "braid",
  description: "Knotless and more.",
  image: "demo/braids.jpg",
  sort: 0,
};

const TYPE = {
  id: "knotless-braids",
  group_id: "braids",
  name: "Knotless braids",
  synonyms: ["knotless"],
  is_other: false,
  active: true,
  default_minutes: 240,
  added_price_pence: 8550,
  default_description: "Back length",
  sort: 0,
};

const getOption = (
  kind: string,
  label: string,
  pence: number,
  sort: number,
) => ({
  id: sort,
  group_id: "braids",
  kind,
  label,
  price_delta_pence: pence,
  minutes_delta: pence / 100,
  sort,
});

describe("toCatalogue", () => {
  it("maps the rows to pounds, keeping each group's options in order", () => {
    const catalogue = toCatalogue({
      groups: [GROUP, { ...GROUP, id: "natural", name: "Natural Hair" }],
      types: [TYPE],
      customisations: [
        getOption("size", "Small", 4500, 0),
        getOption("length", "Bob", -2000, 1),
        getOption("size", "Large", -1000, 2),
      ],
      addons: [
        {
          id: 1,
          group_id: "braids",
          name: "Beads",
          price_pence: 1000,
          minutes: 15,
          sort: 0,
        },
      ],
    });

    expect(catalogue.groups).toEqual([
      {
        id: "braids",
        name: "Braids & Twists",
        icon: "braid",
        description: "Knotless and more.",
        image: "demo/braids.jpg",
      },
      expect.objectContaining({ id: "natural" }),
    ]);

    expect(catalogue.types).toEqual([
      {
        id: "knotless-braids",
        groupId: "braids",
        name: "Knotless braids",
        synonyms: ["knotless"],
        isOther: false,
        isActive: true,
        defaultMinutes: 240,
        addedPrice: 85.5,
        defaultDescription: "Back length",
      },
    ]);

    expect(catalogue.customisations).toEqual({
      braids: {
        size: [
          { label: "Small", price: 45, minutes: 45 },
          { label: "Large", price: -10, minutes: -10 },
        ],
        length: [{ label: "Bob", price: -20, minutes: -20 }],
      },
    });

    expect(catalogue.addons).toEqual({
      braids: [{ name: "Beads", price: 10, minutes: 15 }],
      natural: [],
    });
  });

  it("keeps retired types, marked inactive, and leaves missing defaults empty", () => {
    const { types } = toCatalogue({
      groups: [GROUP],
      types: [
        { ...TYPE, id: "retired", active: false },
        {
          ...TYPE,
          id: "other-braids",
          is_other: true,
          default_minutes: null,
          added_price_pence: null,
          default_description: null,
        },
      ],
      customisations: [],
      addons: [],
    });

    expect(types).toEqual([
      expect.objectContaining({ id: "retired", isActive: false }),
      expect.objectContaining({
        id: "other-braids",
        isActive: true,
        isOther: true,
        defaultMinutes: null,
        addedPrice: null,
        defaultDescription: null,
      }),
    ]);
  });
});
