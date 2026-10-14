export const SUPPORT_EMAIL = "info@tiwarashouse.com";

export const getSupportMailto = (subject?: string) =>
  `mailto:${SUPPORT_EMAIL}${subject ? `?subject=${encodeURIComponent(subject)}` : ""}`;
