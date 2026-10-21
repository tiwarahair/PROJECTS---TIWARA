import type { StudioState } from "../types";

export const hasTwoFactor = (state: StudioState): boolean =>
  state.twoFactorSettings.devices.length > 0;

export const isLive = (state: StudioState): boolean =>
  hasTwoFactor(state) && !!state.tax && !!state.check.stripe;

export const getBookingLink = ({ account }: StudioState) =>
  `tiwarashouse.com/${account.slug}`;

export const getProfilePath = ({ account }: StudioState) => `/${account.slug}`;

export const getSteps = (state: StudioState) => ({
  availability: !!state.check.availability,
  profile: !!state.check.profile,
  secure: isLive(state),
  services: state.services.some(({ status }) => status === "active"),
});

export const getQueryParam = (key: string) => {
  try {
    return new URLSearchParams(location.search).get(key);
  } catch {
    return null;
  }
};
