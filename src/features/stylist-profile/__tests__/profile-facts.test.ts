import { describe, expect, it } from "vitest";
import { toPublicStylist } from "../../../lib/public-stylist";
import { PUBLIC_PROFILE } from "../../../test/public-profile";
import { getGallery, getLoginHref, getProfileFacts } from "../profile-facts";

const { stylist, socials } = toPublicStylist(PUBLIC_PROFILE);

describe("profile facts", () => {
  it("the gallery starts with the cover and has no duplicates", () => {
    const gallery = getGallery(stylist);

    expect(gallery[0]).toBe(stylist.cover);
    expect(new Set(gallery).size).toBe(gallery.length);
  });

  it("builds the policy chips and contact links", () => {
    const facts = getProfileFacts(stylist, socials);

    expect(facts.cancelChip).toBe("");
    expect(facts.hasPayChip).toBe(false);
    expect(facts.mailto).toBe("");
    expect(facts.siteHref).toBe("https://tiwarashouse.com");
    expect(facts.instagramHref).toBe("https://www.instagram.com/tiwarashouse");
    expect(facts.tiktokHref).toBe("");
    expect(facts.youtubeHref).toBe("");

    const withSocials = getProfileFacts(stylist, {
      instagram: "tiwarashouse",
      tiktok: "tiwara.house",
      youtube: "TiwarasHouse",
    });

    expect(withSocials.tiktokHref).toBe("https://www.tiktok.com/@tiwara.house");

    expect(withSocials.youtubeHref).toBe(
      "https://www.youtube.com/@TiwarasHouse",
    );

    expect(
      getProfileFacts({ ...stylist, email: "hello@crowned.studio" }, socials)
        .mailto,
    ).toBe("mailto:hello@crowned.studio");
  });

  it("log in returns to the profile", () => {
    expect(getLoginHref("tiwaras-house")).toBe(
      "/login?screen=cust-email&return=%2Ftiwaras-house",
    );
  });
});
