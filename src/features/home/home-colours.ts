// Colour helpers from prototype Home.dc.html (hexA, isDarkBg).

/** "#faf6ee", 0.85 → "rgba(250,246,238,0.85)" */
export const hexToRgba = (hex: string, alpha: number): string => {
  const digits = hex.replace("#", "");
  const red = parseInt(digits.slice(0, 2), 16);
  const green = parseInt(digits.slice(2, 4), 16);
  const blue = parseInt(digits.slice(4, 6), 16);
  return "rgba(" + red + "," + green + "," + blue + "," + alpha + ")";
};

/** Relative luminance below .4 — ink bands get the cream nav treatment. */
export const isDarkBackground = (hex: unknown): boolean => {
  if (typeof hex !== "string") return false;
  const digits = hex.trim().replace("#", "");
  if (digits.length !== 6) return false;
  const [red = 0, green = 0, blue = 0] = [0, 2, 4]
    .map((index) => parseInt(digits.slice(index, index + 2), 16) / 255)
    .map((channel) =>
      channel <= 0.03928
        ? channel / 12.92
        : Math.pow((channel + 0.055) / 1.055, 2.4),
    );
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue < 0.4;
};
