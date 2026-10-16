import { describe, expect, it } from "vitest";
import { detailsSchema } from "../schemas";

const getErrorKeys = (details: Record<string, string>) =>
  detailsSchema
    .safeParse(details)
    .error?.issues.map(({ path }) => path.join("."));

describe("detailsSchema", () => {
  it("flags every empty contact field and a non-UK mobile", () => {
    expect(
      getErrorKeys({ first: " ", last: "", email: "", phone: "", notes: "" }),
    ).toEqual(["first", "last", "email", "phone"]);

    expect(
      getErrorKeys({
        first: "Nia",
        last: "Okafor",
        email: "nia@gmail.com",
        phone: "0161 496 0000",
        notes: "",
      }),
    ).toEqual(["phone"]);
  });

  it("accepts a filled-in contact", () => {
    expect(
      getErrorKeys({
        first: "Nia",
        last: "Okafor",
        email: "nia@gmail.com",
        phone: "+44 7700 900123",
        notes: "",
      }),
    ).toBeUndefined();
  });
});
