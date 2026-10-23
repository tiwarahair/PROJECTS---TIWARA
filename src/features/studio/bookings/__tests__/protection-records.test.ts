import { describe, expect, it } from "vitest";
import { getRow } from "../../../../test/studio-booking-row";
import { getProtectionFields, getServiceFields } from "../protection-records";
import { toStudioBooking } from "../records";

describe("getProtectionFields", () => {
  it("shows a pending link with its deadline, resends and amount", () => {
    const fields = getProtectionFields(
      getRow({
        status: "awaiting_confirmation",
        protection_status: "pending",
        paid_at: null,
        stripe_payment_method_id: null,
        due_today_pence: 1448,
        confirm_by: "2026-10-21T09:00:00Z",
        confirm_sent_at: "2026-10-19T09:00:00Z",
        confirm_sends: 2,
      }),
    );

    expect(fields).toMatchObject({
      paid: "link",
      protect: "link",
      linkAmount: 14.48,
      resends: 1,
      expiresAt: Date.parse("2026-10-21T09:00:00Z"),
      linkSentAt: Date.parse("2026-10-19T09:00:00Z"),
      clientLocked: false,
    });
  });

  it("says when protection was skipped, and locks the client once they've paid or saved a card", () => {
    expect(
      getProtectionFields(
        getRow({
          protection_status: "overridden",
          paid_at: null,
          stripe_payment_method_id: null,
        }),
      ),
    ).toMatchObject({ protect: "none", clientLocked: false });

    expect(
      getProtectionFields(
        getRow({
          terms: { mode: "card" },
          paid_at: "2026-10-15T10:00:00Z",
          stripe_payment_method_id: "pm_1",
        }),
      ),
    ).toMatchObject({ clientLocked: true, protectionMode: "card" });
  });

  it("keeps the deposit agreed when the booking was made", () => {
    expect(
      getProtectionFields(getRow({ price_pence: 9000 })).agreedDeposit,
    ).toBe(13);
  });
});

describe("getServiceFields", () => {
  it("reads the booking's own add-on prices, extra time and price reason", () => {
    expect(
      getServiceFields(
        getRow({
          buffer_minutes: 10,
          snapshot: {
            service_name: "Silk press",
            price_reason: "Longer hair",
            addons: [
              {
                id: "a-1",
                name: "Beads",
                price_pence: 600,
                minutes: 30,
                quantity: 2,
              },
            ],
          },
        }),
      ),
    ).toEqual({
      serviceId: "s-1",
      extra: 10,
      priceReason: "Longer hair",
      addons: [
        {
          id: "a-1",
          addonId: "a-1",
          name: "Beads",
          price: 6,
          minutes: 30,
          quantity: 2,
        },
      ],
    });
  });
});

describe("walk-ins", () => {
  it("have no client", () => {
    expect(toStudioBooking(getRow({ contact: null }))).toMatchObject({
      client: null,
      walkIn: true,
    });
  });
});
