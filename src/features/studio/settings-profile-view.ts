// Studio → Settings → Your profile: photos, the profile fields and Save.
import type { ChangeEvent } from "react";
import { getSettingsSave } from "./settings-save";
import {
  addPortfolioPhotos,
  removePortfolioItem,
  replacePhoto,
} from "./studio-photos";
import { getSavedSettings } from "./studio-unsaved";
import type { StudioController } from "./use-studio";

/** The fewest portfolio photos a profile can be saved with. */
const MIN_PORTFOLIO = 2;

export const PORTFOLIO_ERROR_ID = "portfolio-error";

export const getProfileView = (studio: StudioController) => {
  const { state, setState, actions, context } = studio;
  const { showToast, leavePage, checkDone } = actions;
  const { sync, saveStylist, markSaved } = getSettingsSave(studio);

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

  const store = (key: string, value: string) => {
    try {
      localStorage.setItem(key, value);
    } catch {
      // storage can be blocked
    }
  };

  const setProfile = (patch: Partial<typeof state.profile>) =>
    setState(({ profile }) => ({ profile: { ...profile, ...patch } }));

  return {
    onCoverFile: (event: ChangeEvent<HTMLInputElement>) =>
      readFile(event, (url, file) => {
        if (sync) return replacePhoto(context, "cover", file, url);

        setState({ coverUrl: url });
        store("studio.cover", url);
      }),
    onAvatarFile: (event: ChangeEvent<HTMLInputElement>) =>
      readFile(event, (url, file) => {
        if (sync) return replacePhoto(context, "avatar", file, url);

        setState({ avatarUrl: url });
        store("studio.avatar", url);
      }),
    setProfile,
    portfolio: state.portfolio.map(({ id, src }) => ({
      key: id,
      src,
      remove: () => {
        if (sync) return removePortfolioItem(context, id);

        setState(({ portfolio }) => ({
          portfolio: portfolio.filter((item) => item.id !== id),
        }));
      },
    })),
    portCount: `${state.portfolio.length} of 20`,
    portfolioError:
      state.isPortfolioErrorShown && state.portfolio.length < MIN_PORTFOLIO
        ? `Provide at least ${MIN_PORTFOLIO} portfolio images`
        : "",
    canAddPhotos: state.portfolio.length < 20,
    onPortFiles: (event: ChangeEvent<HTMLInputElement>) => {
      const room = 20 - state.portfolio.length;
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
      ).then((urls) => {
        if (sync)
          return addPortfolioPhotos(
            context,
            files.map((file, index) => ({
              file,
              previewUrl: urls[index] ?? "",
            })),
          );

        if (urls.length)
          setState(({ portfolio }) => ({
            portfolio: portfolio.concat(
              urls.map((src, index) => ({
                id: `pf${Date.now()}${index}`,
                src,
              })),
            ),
          }));
      });
    },
    saveProfile: async () => {
      if (state.portfolio.length < MIN_PORTFOLIO) {
        setState({ isPortfolioErrorShown: true });

        // the message sits by the photos, often below the fold: bring it into view once it renders
        window.setTimeout(() =>
          document
            .getElementById(PORTFOLIO_ERROR_ID)
            ?.scrollIntoView({ block: "center", behavior: "smooth" }),
        );

        return;
      }

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
          instagram: instagram || null,
          tiktok: tiktok || null,
          youtube: youtube || null,
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
