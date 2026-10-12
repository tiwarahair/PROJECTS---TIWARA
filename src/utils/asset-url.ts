// Pages reference images by their path inside assets/ ("site/hero.jpg", "logos/logo-crimson.png"),
// sometimes built at runtime (the AI preview renders). Map those exact strings to Vite-hashed URLs.
const assetModules = import.meta.glob<string>(
  "../../assets/**/*.{jpg,jpeg,png,webp}",
  {
    eager: true,
    query: "?url",
    import: "default",
  },
);

const assetUrls = new Map(
  Object.entries(assetModules).map(([modulePath, url]) => [
    modulePath.replace("../../assets/", ""),
    url,
  ]),
);

/** Resolve a relative asset path (e.g. "demo/stylists/w160524.jpg") to its bundled URL. */
export const getAssetUrl = (relativePath: string): string => {
  const url = assetUrls.get(relativePath.replace(/^\.?\//, ""));

  if (!url) throw new Error(`Unknown asset: ${relativePath}`);

  return url;
};

/** Like getAssetUrl, but passes through anything that is not a bundled asset (absolute URLs, data URIs). */
export const resolveAssetUrl = (path: string): string =>
  assetUrls.get(path.replace(/^\.?\//, "")) ?? path;
