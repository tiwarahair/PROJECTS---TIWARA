import { describe, expect, it } from "vitest";
import type { SavedAddress } from "../../../types/address";
import { getSavedAddressList, getSavedMobile, toSavedCard } from "../saves";

const HOME: SavedAddress = {
  id: "a1",
  label: "Home",
  line1: "1 High St",
  line2: "",
  town: "Leeds",
  postcode: "LS1 1AA",
  isDefault: true,
};

describe("account saves", () => {
  it("stores a mobile without its leading zero, split after four digits", () => {
    expect(getSavedMobile("07700 900123")).toBe("7700 900123");
  });

  it("turns the card form into a saved card", () => {
    const card = toSavedCard(
      {
        number: "5555 5555 5555 4444",
        expiry: "08 / 29",
        cvc: "123",
        isDefault: false,
      },
      "c1",
      true,
    );

    expect(card).toEqual({
      id: "c1",
      brand: "Mastercard",
      last4: "4444",
      expiry: "08/29",
      isDefault: true,
    });
  });

  it("the first address saved becomes the default", () => {
    const list = getSavedAddressList(
      [],
      { mode: "add" },
      {
        label: " ",
        address: { line1: "2 Low St", town: "York", postcode: "yo17hh" },
        isDefault: false,
      },
      "a2",
    );

    expect(list).toEqual([
      {
        id: "a2",
        label: "Address",
        line1: "2 Low St",
        line2: "",
        town: "York",
        postcode: "YO1 7HH",
        isDefault: true,
      },
    ]);
  });

  it("a new default address takes the default from the others", () => {
    const list = getSavedAddressList(
      [HOME],
      { mode: "add" },
      {
        label: "Work",
        address: { line1: "3 Mid St", town: "Hull", postcode: "HU1 1AA" },
        isDefault: true,
      },
      "a3",
    );

    expect(list.map(({ id, isDefault }) => [id, isDefault])).toEqual([
      ["a1", false],
      ["a3", true],
    ]);
  });

  it("editing an address keeps its id and default", () => {
    const [edited] = getSavedAddressList(
      [HOME],
      { mode: "edit", id: "a1" },
      {
        label: "Flat",
        address: { line1: "4 New St", town: "Leeds", postcode: "LS2 2BB" },
        isDefault: false,
      },
      "unused",
    );

    expect(edited).toMatchObject({
      id: "a1",
      label: "Flat",
      line1: "4 New St",
      isDefault: true,
    });
  });
});
