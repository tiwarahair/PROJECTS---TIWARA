import { describe, expect, it } from "vitest";
import { stylists } from "../../../../data";
import type { Service } from "../../../../types/service";
import { getServiceOptions } from "../../../../utils/services";
import { getBookingMoney } from "../pricing";

// the same service and picks as price_booking's test in supabase/tests/bookings.test.sql
const SERVICE: Service = {
  id: "priced",
  name: "Knotless braids",
  serviceTypeId: "knotless-braids",
  categoryId: null,
  price: 50,
  minutes: 60,
  description: "",
  status: "active",
  customisations: {
    size: {
      on: true,
      options: [
        { label: "Small", on: true, priceDelta: 45, minutesDelta: 60 },
        { label: "Medium", on: true, priceDelta: 0, minutesDelta: 0 },
      ],
    },
    length: {
      on: true,
      options: [
        { label: "Waist", on: true, priceDelta: 50, minutesDelta: 60 },
        { label: "Shoulder", on: true, priceDelta: 0, minutesDelta: 0 },
      ],
    },
  },
  ownCustomisations: [
    {
      name: "Parting",
      options: [
        { label: "Straight", priceDelta: 0, minutesDelta: 0 },
        { label: "Zig-zag", priceDelta: 10, minutesDelta: 20 },
      ],
    },
  ],
  addons: [{ name: "Beads", price: 8, minutes: 15 }],
};

describe("getBookingMoney", () => {
  it("matches the database's price_booking for the same picks", () => {
    const stylist = {
      ...stylists[0]!,
      policies: { ...stylists[0]!.policies, mode: "none" as const },
    };

    const money = getBookingMoney(
      stylist,
      SERVICE,
      getServiceOptions(SERVICE),
      {
        size: "Small",
        length: "Waist",
        colour: "",
        own: { Parting: "Zig-zag" },
        addons: ["Beads"],
      },
    );

    expect(money.price).toBe("£163");
    expect(money.duration).toBe("3h 35m");
    expect(money.policy.fee).toBe(2.95);
  });
});
