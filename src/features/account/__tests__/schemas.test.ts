import { describe, expect, it } from "vitest";
import type { z } from "zod";
import { getEditSchema } from "../schemas";

const getMessages = (result: z.ZodSafeParseResult<unknown>) =>
  Object.fromEntries(
    (result.error?.issues ?? [])
      .reverse()
      .map(({ path, message }) => [String(path[0]), message]),
  );

const PROFILE = {
  first: "Nia",
  last: "Okafor",
  email: "nia.okafor@gmail.com",
  mobile: "7700 900412",
};

describe("account schemas", () => {
  it("validates the personal details edits", () => {
    const check = (key: "name" | "email" | "mobile", draft = PROFILE) =>
      getMessages(getEditSchema(key, PROFILE.email).safeParse(draft));

    expect(check("name", { ...PROFILE, first: " " })).toEqual({
      first: "Enter your first name",
    });

    expect(check("email")).toEqual({ email: "That’s already your email" });

    expect(check("mobile", { ...PROFILE, mobile: "07700 900123" })).toEqual({});

    expect(check("mobile", { ...PROFILE, mobile: "0123" })).toEqual({
      mobile: "Enter a UK mobile number, like 07700 900123",
    });
  });
});
