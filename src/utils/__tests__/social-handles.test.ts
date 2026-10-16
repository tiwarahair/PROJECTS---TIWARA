import { describe, expect, it } from "vitest";
import { getSocialHandleError, getSocialUrl } from "../social-handles";

describe("getSocialHandleError", () => {
  it("accepts a plain username and a blank field", () => {
    expect(getSocialHandleError("instagram", "tiwarashouse")).toBe("");
    expect(getSocialHandleError("instagram", "tiwaras.house_mcr")).toBe("");
    expect(getSocialHandleError("tiktok", "tiwarashouse")).toBe("");
    expect(getSocialHandleError("youtube", "Tiwaras-House")).toBe("");
    expect(getSocialHandleError("instagram", "  ")).toBe("");
    expect(getSocialHandleError("instagram", "mike.net")).toBe("");
    expect(getSocialHandleError("instagram", "braids.by.bella")).toBe("");
  });

  it("asks for just the username when given a link", () => {
    for (const link of [
      "https://www.instagram.com/tiwarashouse",
      "instagram.com/tiwarashouse",
      "www.instagram.com/tiwarashouse",
      "tiktok.com/@tiwarashouse",
    ])
      expect(getSocialHandleError("instagram", link)).toBe(
        "Enter just your Instagram username, not a link",
      );

    expect(getSocialHandleError("youtube", "youtu.be/abc")).toBe(
      "Enter just your YouTube username, not a link",
    );
  });

  it("asks to leave out the @", () => {
    expect(getSocialHandleError("tiktok", "@tiwarashouse")).toBe(
      "Leave out the @, just your username",
    );
  });

  it("follows each platform's characters and length", () => {
    expect(getSocialHandleError("instagram", "tiwaras house")).toBe(
      "Instagram usernames only use letters, numbers, full stops and underscores",
    );

    expect(getSocialHandleError("instagram", "tiwaras-house")).not.toBe("");
    expect(getSocialHandleError("youtube", "tiwaras-house")).toBe("");

    expect(getSocialHandleError("tiktok", "a")).toBe(
      "TikTok usernames are 2–24 characters",
    );

    expect(getSocialHandleError("instagram", "a".repeat(31))).toBe(
      "Instagram usernames are 1–30 characters",
    );
  });

  it("follows the full stop rules", () => {
    expect(getSocialHandleError("tiktok", "tiwarashouse.")).toBe(
      "TikTok usernames can’t end with a full stop",
    );

    expect(getSocialHandleError("instagram", ".tiwarashouse")).toBe(
      "Instagram usernames can’t start with a full stop or have two in a row",
    );

    expect(getSocialHandleError("instagram", "tiwaras..house")).not.toBe("");
  });
});

describe("getSocialUrl", () => {
  it("builds each platform's profile link", () => {
    expect(getSocialUrl("instagram", "tiwarashouse")).toBe(
      "https://www.instagram.com/tiwarashouse",
    );

    expect(getSocialUrl("tiktok", "tiwarashouse")).toBe(
      "https://www.tiktok.com/@tiwarashouse",
    );

    expect(getSocialUrl("youtube", "TiwarasHouse")).toBe(
      "https://www.youtube.com/@TiwarasHouse",
    );
  });

  it("gives no link without a username", () => {
    expect(getSocialUrl("instagram", null)).toBe("");
    expect(getSocialUrl("tiktok", " ")).toBe("");
  });
});
