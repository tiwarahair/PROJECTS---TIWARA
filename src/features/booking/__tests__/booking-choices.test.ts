import { describe, expect, it } from "vitest";
import { toPublicStylist } from "../../../lib/public-stylist";
import { getDemoProfile } from "../../../test/demo-profile";
import { findService, getServiceOptions } from "../../../utils/services";
import { toChoices } from "../booking-choices";

const { stylist } = toPublicStylist(getDemoProfile("tiwaras-house"));
const knotless = findService(stylist, "Knotless braids");

describe("toChoices", () => {
  it("sends the ids of the picked size, length, own answers and add-ons, and the colour for braids", () => {
    expect(
      toChoices(getServiceOptions(knotless), {
        size: "Small",
        length: "Waist/Bum",
        colour: "1B Natural Black",
        own: { Parting: "Zig-zag" },
        addons: ["Beads"],
      }),
    ).toEqual({
      variations: [
        "tiwaras-house--knotless-braids-size-Small",
        "tiwaras-house--knotless-braids-length-Waist/Bum",
        "tiwaras-house--knotless-braids-own-Parting-Zig-zag",
      ],
      addons: ["tiwaras-house-addon-Beads"],
      colour: "1B Natural Black",
    });
  });

  it("leaves out anything not picked, and the colour for services without one", () => {
    const silk = findService(stylist, "Silk press");

    expect(
      toChoices(getServiceOptions(silk), {
        size: null,
        length: null,
        colour: "30 Auburn",
        own: {},
        addons: [],
      }),
    ).toEqual({
      variations: [],
      addons: [],
    });
  });
});
