export const getSavedMobile = (mobile: string) => {
  const digits = mobile.replace(/\D/g, "").replace(/^0/, "");

  return `${digits.slice(0, 4)} ${digits.slice(4)}`;
};
