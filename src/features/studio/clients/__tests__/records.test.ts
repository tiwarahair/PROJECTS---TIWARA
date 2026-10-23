import { describe, expect, it } from "vitest";
import { getClientRow } from "../../../../test/studio-booking-row";
import { toStudioClient } from "../records";

describe("toStudioClient", () => {
  it("shows the client's own allergy note with who added it", () => {
    expect(
      toStudioClient(
        getClientRow({
          allergies: "Sensitive scalp",
          allergies_at: "2026-10-03T10:00:00+00:00",
          allergies_by: "Nia",
        }),
      ),
    ).toMatchObject({
      sensitivities: "Sensitive scalp",
      sensitivitiesNote: "Added by Nia on 3 Oct",
    });
  });

  it("can be deleted once 120 days have passed since their last payment", () => {
    expect(toStudioClient(getClientRow({})).deletableFrom).toBeUndefined();

    expect(
      toStudioClient(
        getClientRow({ last_payment_at: new Date().toISOString() }),
      ).deletableFrom,
    ).toMatch(/\d{4}$/);
  });
});
