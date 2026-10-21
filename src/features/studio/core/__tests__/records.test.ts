import { describe, expect, it } from "vitest";
import type { ServiceRow } from "../../../../lib/studio-api";
import {
  toShownBusinessType,
  toStoredBusinessType,
} from "../../../../utils/business-type";
import { buildBlockedTime, fromBlockedTime } from "../blocked-time";
import {
  fromStudioAddon,
  fromStudioService,
  toStudioService,
  toVariationRow,
} from "../../services/records";
import { fromHours } from "../../settings/records";
import { getStudioRow } from "../../../../test/studio-seed";
import { getInitialStudioState } from "../initial-state";
import {
  toNotificationEvent,
  toNotificationKey,
  toStudioPatch,
} from "../records";

const SERVICE_ROW: ServiceRow = {
  id: "service-1",
  stylist_id: "stylist-1",
  service_type_id: "knotless-braids",
  service_group_id: "braids",
  category_id: "category-1",
  name: "Knotless braids",
  description: "Light, neat and long-lasting.",
  price_pence: 12050,
  duration_min: 270,
  extra_time_min: null,
  status: "active",
  sizes_on: true,
  lengths_on: false,
  sort: 0,
  service_variations: [
    {
      id: "v2",
      service_id: "service-1",
      kind: "size",
      label: "Large",
      offered: true,
      price_delta_pence: -1000,
      minutes_delta: -45,
      sort: 1,
      group_name: null,
    },
    {
      id: "v1",
      service_id: "service-1",
      kind: "size",
      label: "Small",
      offered: false,
      price_delta_pence: 2500,
      minutes_delta: 90,
      sort: 0,
      group_name: null,
    },
    {
      id: "v3",
      service_id: "service-1",
      kind: "own",
      label: "Curly ends",
      offered: true,
      price_delta_pence: 500,
      minutes_delta: 15,
      sort: 0,
      group_name: "Finish",
    },
  ],
  service_addons: [
    {
      service_id: "service-1",
      addon_id: "addon-1",
      price_override_pence: 600,
      minutes_override: 75,
    },
  ],
};

describe("studio-records", () => {
  it("shows a size row's signed price and time as the wizard's fields", () => {
    expect(toVariationRow("Small", 25, 90)).toEqual({
      label: "Small",
      on: true,
      negative: false,
      priceDelta: "25",
      hoursDelta: "1",
      minutesDelta: "30",
    });

    expect(toVariationRow("Large", -10, -45, false)).toMatchObject({
      on: false,
      negative: true,
      priceDelta: "-10",
      minutesDelta: "-45",
    });
  });

  it("reads a service row in pounds and hours, sizes in order", () => {
    const service = toStudioService(SERVICE_ROW);

    expect(service).toMatchObject({
      price: 120.5,
      durationHours: 4,
      durationMinutes: 30,
      extraCustom: false,
    });

    expect(service.sizes.map(({ label }) => label)).toEqual(["Small", "Large"]);

    expect(service.own).toEqual([
      {
        name: "Finish",
        options: [
          {
            label: "Curly ends",
            negative: false,
            priceDelta: "5",
            minutesDelta: "15",
          },
        ],
      },
    ]);

    expect(service.addons).toEqual([
      {
        addonId: "addon-1",
        priceOverride: 6,
        hoursOverride: 1,
        minutesOverride: 15,
      },
    ]);
  });

  it("writes a service back to the same pence and minutes", () => {
    const { row, variations, addonLinks } = fromStudioService(
      toStudioService(SERVICE_ROW),
      "stylist-1",
      3,
    );

    expect(row).toMatchObject({
      price_pence: 12050,
      duration_min: 270,
      extra_time_min: null,
      service_type_id: "knotless-braids",
      sort: 3,
    });

    expect(
      variations.map(({ kind, label, price_delta_pence, minutes_delta }) => [
        kind,
        label,
        price_delta_pence,
        minutes_delta,
      ]),
    ).toEqual([
      ["size", "Small", 2500, 90],
      ["size", "Large", -1000, -45],
      ["own", "Curly ends", 500, 15],
    ]);

    expect(addonLinks).toEqual([
      {
        service_id: "service-1",
        addon_id: "addon-1",
        price_override_pence: 600,
        minutes_override: 75,
      },
    ]);
  });

  it("gives a service with no type its group's matching type, else the group's Other", () => {
    const service = { ...toStudioService(SERVICE_ROW), typeId: null };

    expect(fromStudioService(service, "stylist-1", 0).row.service_type_id).toBe(
      "knotless-braids",
    );

    const renamed = { ...service, subcategory: "Fishtail braids" };

    expect(fromStudioService(renamed, "stylist-1", 0).row.service_type_id).toBe(
      "other-braids",
    );
  });

  it("saves an add-on's pounds and time as pence and minutes", () => {
    expect(
      fromStudioAddon(
        {
          id: "addon-1",
          categoryId: null,
          name: " Gold cuffs ",
          price: "8",
          hours: 0,
          min: "15",
        },
        "stylist-1",
      ),
    ).toMatchObject({ name: "Gold cuffs", price_pence: 800, minutes: 15 });
  });

  it("numbers working hours from Monday", () => {
    const rows = fromHours(
      [
        { day: "Mon", on: true, start: "09:00", end: "18:00" },
        { day: "Tue", on: false, start: "09:00", end: "18:00" },
      ],
      "stylist-1",
    );

    expect(rows.map(({ weekday, is_open }) => [weekday, is_open])).toEqual([
      [0, true],
      [1, false],
    ]);
  });

  it("saves a blocked time's times, or none when it's all day", () => {
    const fields = {
      id: "block-1",
      dayIndex: 0,
      allDay: false,
      start: "13:00",
      end: "14:00",
      note: "Lunch",
      frequency: "weekly",
      ends: "never",
      color: "purple",
    };

    expect(
      fromBlockedTime(buildBlockedTime(fields), "stylist-1"),
    ).toMatchObject({
      start_time: "13:00",
      end_time: "14:00",
      all_day: false,
      repeat: "weekly",
      reason: "Lunch",
    });

    expect(
      fromBlockedTime(buildBlockedTime({ ...fields, allDay: true }), "s"),
    ).toMatchObject({ all_day: true, start_time: null, end_time: null });
  });

  it("maps business types both ways", () => {
    expect(toShownBusinessType("chair_rental")).toBe("chair");
    expect(toStoredBusinessType("home")).toBe("home_based");
    expect(toShownBusinessType("unknown")).toBe("shop");
  });
});

describe("notification event names", () => {
  it("convert between the database and Settings", () => {
    expect(toNotificationKey("auto_cancel_soon")).toBe("autoCancelSoon");
    expect(toNotificationEvent("autoCancelSoon")).toBe("auto_cancel_soon");
  });
});

describe("toStudioPatch", () => {
  it("suggests a 20% deposit to a stylist without one and falls back to the database defaults for missing rules", () => {
    const studio = getStudioRow();
    const [policy] = studio.payment_policies;

    if (!policy) throw new Error("the studio row has a policy");

    const { policy: shown, rules } = toStudioPatch(
      {
        ...studio,
        payment_policies: [{ ...policy, mode: "none", deposit_percent: 0 }],
      },
      getInitialStudioState(),
    );

    expect(shown).toMatchObject({ mode: "none", deposit: 20 });

    expect(rules).toEqual({
      minNotice: 24,
      maxNotice: 3,
      extra: 0,
      travel: 0,
    });
  });
});
