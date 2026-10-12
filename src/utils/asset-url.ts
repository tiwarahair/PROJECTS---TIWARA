// Pages reference images by relative path ("img/hero.jpg", "logo-crimson.png"),
// often built at runtime ('img/' + name). Map those exact strings to Vite-hashed URLs.
const assetModules = import.meta.glob<string>(
  "../assets/**/*.{jpg,jpeg,png,webp}",
  {
    eager: true,
    query: "?url",
    import: "default",
  },
);

const assetUrls = new Map(
  Object.entries(assetModules).map(([modulePath, url]) => [
    modulePath.replace("../assets/", ""),
    url,
  ]),
);

/** Resolve a relative asset path (e.g. "img/w160524.jpg") to its bundled URL. */
export const getAssetUrl = (prototypePath: string): string => {
  const url = assetUrls.get(prototypePath.replace(/^\.?\//, ""));

  if (!url) throw new Error(`Unknown asset: ${prototypePath}`);

  return url;
};

/** Like getAssetUrl, but passes through anything that is not a bundled asset (absolute URLs, data URIs). */
export const resolveAssetUrl = (path: string): string =>
  assetUrls.get(path.replace(/^\.?\//, "")) ?? path;
