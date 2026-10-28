// Studio → Settings → Your profile: photos, the profile fields and Save.
import type { ChangeEvent } from "react";
import { getSettingsSave } from "../save";
import {
  addPortfolioPhotos,
  removePortfolioItem,
  replacePhoto,
} from "./photos";
import { getSavedSettings } from "../../core/unsaved";
import { PORTFOLIO_LIMIT } from "../../core/constants";
import { getPhotoServiceName } from "./attach-view";
import type { StudioController } from "../../core/use-studio";

export const getProfileView = (studio: StudioController) => {
  const { state, setState, actions, context } = studio;
  const { showToast, leavePage, checkDone } = actions;
  const { saveStylist, markSaved } = getSettingsSave(studio);

  const readFile = (
    event: ChangeEvent<HTMLInputElement>,
    done: (url: string, file: File) => void,
  ) => {
    const file = event.target.files?.[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => done(String(reader.result), file);
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  const setProfile = (patch: Partial<typeof state.profile>) =>
    setState(({ profile }) => ({ profile: { ...profile, ...patch } }));

  return {
    onCoverFile: (event: ChangeEvent<HTMLInputElement>) =>
      readFile(event, (url, file) => replacePhoto(context, "cover", file, url)),
    onAvatarFile: (event: ChangeEvent<HTMLInputElement>) =>
      readFile(event, (url, file) =>
        replacePhoto(context, "avatar", file, url),
      ),
    setProfile,
    portfolio: state.portfolio.map(({ id, src }) => ({
      key: id,
      src,
      serviceName: getPhotoServiceName(state, id),
      remove: () => removePortfolioItem(context, id),
    })),
    portCount: `${state.portfolio.length} of ${PORTFOLIO_LIMIT}`,
    canAddPhotos: state.portfolio.length < PORTFOLIO_LIMIT,
    onPortFiles: (event: ChangeEvent<HTMLInputElement>) => {
      const room = PORTFOLIO_LIMIT - state.portfolio.length;
      const files = Array.from(event.target.files || []).slice(0, room);

      event.target.value = "";

      void Promise.all(
        files.map(
          (file) =>
            new Promise<string>((resolve) => {
              const reader = new FileReader();

              reader.onload = () => resolve(String(reader.result));
              reader.readAsDataURL(file);
            }),
        ),
      ).then((urls) =>
        addPortfolioPhotos(
          context,
          files.map((file, index) => ({
            file,
            previewUrl: urls[index] ?? "",
          })),
        ),
      );
    },
    saveProfile: async () => {
      if (context.memo.saveSlug && !(await context.memo.saveSlug())) return;

      const { profile, business, check } = state;
      const { salon, about, instagram, tiktok, youtube, site, email } = profile;

      const { saved, restoreSaved } = markSaved({
        profile: getSavedSettings(state).profile,
      });

      // Business details shows the same contact email
      setState({
        check: { ...check, profile: true },
        business: { ...business, details: { ...business.details, email } },
      });

      saveStylist(
        {
          business_name: salon.trim() || undefined,
          bio: about,
          instagram: instagram.trim() || null,
          tiktok: tiktok.trim() || null,
          youtube: youtube?.trim() || null,
          website: site || null,
          contact_email: email || null,
          profile_confirmed_at: new Date().toISOString(),
        },
        { check, business, profile: { ...profile, ...saved?.profile } },
        restoreSaved,
      );

      showToast("Profile saved");
      leavePage();
      checkDone();
    },
  };
};
