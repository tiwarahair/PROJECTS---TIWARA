import manifest from "../../assets/generated/manifest.json";

// Pages reference images by their path inside assets/ ("site/hero.jpg", "logos/logo-crimson.png"),
// sometimes built at runtime (the AI preview renders). Map those exact strings to Vite-hashed URLs.
const assetModules = import.meta.glob<string>(
  "../../assets/**/*.{jpg,jpeg,png,webp,avif}",
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

interface AssetVariants {
  width: number;
  height: number;
  widths: number[];
}

const assetVariants: Record<string, AssetVariants | undefined> = manifest;

/** srcset lists for a bundled photo's generated copies (yarn images), or null when it has none. */
export const getAssetSources = (path: string) => {
  const key = path.replace(/^\.?\//, "");
  const variants = assetVariants[key];

  if (!variants) return null;

  const { width, height, widths } = variants;
  const base = `generated/${key.replace(/\.jpe?g$/i, "")}`;

  const toSrcSet = (extension: string) =>
    widths
      .map(
        (size) => `${assetUrls.get(`${base}-${size}.${extension}`)} ${size}w`,
      )
      .join(", ");

  return {
    avif: toSrcSet("avif"),
    webp: toSrcSet("webp"),
    fallback: toSrcSet("jpg"),
    src: assetUrls.get(`${base}-${widths[widths.length - 1]}.jpg`) ?? "",
    width,
    height,
  };
};

/** A CSS image-set() of a bundled photo's generated copies at about `width`, for backgrounds; null when it has none. */
export const getAssetImageSet = (path: string, width: number) => {
  const key = path.replace(/^\.?\//, "");
  const widths = assetVariants[key]?.widths;

  if (!widths) return null;

  const size =
    widths.find((candidate) => candidate >= width) ?? widths[widths.length - 1];

  const base = `generated/${key.replace(/\.jpe?g$/i, "")}-${size}`;
  const getUrl = (extension: string) => assetUrls.get(`${base}.${extension}`);

  return {
    avifUrl: getUrl("avif") ?? "",
    jpeg: `url('${getUrl("jpg")}')`,
    imageSet: `image-set(url('${getUrl("avif")}') type("image/avif"), url('${getUrl("webp")}') type("image/webp"), url('${getUrl("jpg")}') type("image/jpeg"))`,
  };
};
