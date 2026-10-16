import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { StudioProfile } from "../../core/types";
import { SOCIAL_PLATFORMS, getProfileValues, profileSchema } from "./schema";
import type { ProfileValues } from "./schema";

export const PROFILE_FORM_ID = "profile-form";

export const useProfileForm = (
  profile: StudioProfile,
  portfolioCount: number,
) => {
  const form = useForm<ProfileValues>({
    values: getProfileValues(profile, portfolioCount),
    resetOptions: {
      keepErrors: true,
      keepIsSubmitted: true,
      keepTouched: true,
    },
    resolver: zodResolver(profileSchema),
    mode: "onTouched",
  });

  const {
    trigger,
    formState: { isSubmitted },
  } = form;

  useEffect(() => {
    void trigger([...SOCIAL_PLATFORMS]);
  }, [trigger]);

  useEffect(() => {
    if (isSubmitted) void trigger("portfolioCount");
  }, [portfolioCount, isSubmitted, trigger]);

  return form;
};

export type ProfileForm = ReturnType<typeof useProfileForm>;
