// The prototype references images by relative path ("img/hero.jpg", "_ds_assets/logo-crimson.png"),
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

/** Resolve a prototype-relative asset path (e.g. "img/w160524.jpg") to its bundled URL. */
export const getAssetUrl = (prototypePath: string): string => {
  const url = assetUrls.get(prototypePath.replace(/^\.?\//, ""));
  if (!url) throw new Error(`Unknown asset: ${prototypePath}`);
  return url;
};
