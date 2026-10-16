import { z } from "zod";
import { getSocialHandleError } from "../../../../utils/social-handles";
import { isValidEmail, isValidWebsite } from "../../../../utils/validation";
import type { StudioProfile } from "../../core/types";

const MIN_PORTFOLIO = 2;

export const SOCIAL_PLATFORMS = ["instagram", "tiktok", "youtube"] as const;

export const profileSchema = z
  .object({
    salon: z.string(),
    about: z.string(),
    site: z.string(),
    instagram: z.string(),
    tiktok: z.string(),
    youtube: z.string(),
    email: z.string(),
    portfolioCount: z.number(),
  })
  .superRefine((values, context) => {
    const flag = (path: keyof ProfileValues, message: string) =>
      context.addIssue({ code: "custom", path: [path], message });

    SOCIAL_PLATFORMS.forEach((platform) => {
      const error = getSocialHandleError(platform, values[platform]);

      if (error) flag(platform, error);
    });

    if (values.email.trim() && !isValidEmail(values.email))
      flag("email", "Enter an email address, like name@example.co.uk.");

    if (values.site.trim() && !isValidWebsite(values.site))
      flag("site", "Enter a website address, like tiwarashouse.com.");

    if (values.portfolioCount < MIN_PORTFOLIO)
      flag(
        "portfolioCount",
        `Provide at least ${MIN_PORTFOLIO} portfolio images`,
      );
  });

export type ProfileValues = z.infer<typeof profileSchema>;

export const getProfileValues = (
  { salon, about, site, instagram, tiktok, youtube, email }: StudioProfile,
  portfolioCount: number,
): ProfileValues => ({
  salon,
  about,
  site,
  instagram,
  tiktok,
  youtube: youtube ?? "",
  email,
  portfolioCount,
});
