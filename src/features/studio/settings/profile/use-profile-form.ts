import { useEffect } from "react";
import { useForm } from "react-hook-form";

export const PROFILE_FORM_ID = "profile-form";

const MIN_PORTFOLIO = 2;

interface ProfileForm {
  portfolioCount: number;
}

export const useProfileForm = (portfolioCount: number) => {
  const form = useForm<ProfileForm>({ defaultValues: { portfolioCount } });

  const {
    register,
    setValue,
    formState: { isSubmitted },
  } = form;

  useEffect(() => {
    register("portfolioCount", {
      min: {
        value: MIN_PORTFOLIO,
        message: `Provide at least ${MIN_PORTFOLIO} portfolio images`,
      },
    });
  }, [register]);

  useEffect(() => {
    setValue("portfolioCount", portfolioCount, { shouldValidate: isSubmitted });
  }, [portfolioCount, isSubmitted, setValue]);

  return form;
};
