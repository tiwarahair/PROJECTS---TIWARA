import type { StudioState } from "../types";

export const hasTwoFactor = (state: StudioState): boolean =>
  state.twoFactorSettings.devices.length > 0;

export const isLive = (state: StudioState): boolean =>
  hasTwoFactor(state) && !!state.tax && !!state.check.stripe;

export const getBookingLink = ({ account }: StudioState) =>
  `${window.location.host}/${account.slug}`;

export const getServiceBookingLink = (
  { account }: StudioState,
  serviceId: string,
) =>
  `${window.location.host}/book?stylist=${account.slug}&service=${encodeURIComponent(serviceId)}`;

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
