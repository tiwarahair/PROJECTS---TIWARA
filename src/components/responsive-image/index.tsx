import { preload } from "react-dom";
import { resolveAssetUrl } from "../../utils/asset-url";
import { getImageSources } from "../../utils/image-sources";
import { LoadingImage } from "../loading-image";
import type { LoadingImageProps } from "../loading-image";

export interface ResponsiveImageProps extends Omit<
  LoadingImageProps,
  "src" | "srcSet" | "sizes"
> {
  /** A bundled asset path ("site/hero.jpg"), a Storage URL or any other URL. */
  src: string;
  /** How wide the image shows at each screen size, so the browser picks the right file. */
  sizes: string;
  /** Shimmer until loaded, then fade in (LoadingImage). */
  hasShimmer?: boolean;
}

/** AVIF, then WebP, then JPEG, each at three widths; anything without copies is a plain image. */
export const ResponsiveImage = ({
  src,
  sizes,
  loading = "lazy",
  decoding = "async",
  hasShimmer = false,
  ...imageProps
}: ResponsiveImageProps) => {
  const sources = getImageSources(src);
  const ImageTag = hasShimmer ? LoadingImage : "img";

  if (!sources)
    return (
      <ImageTag
        src={resolveAssetUrl(src)}
        loading={loading}
        decoding={decoding}
        {...imageProps}
      />
    );

  return (
    <picture>
      {sources.avif && (
        <source type="image/avif" srcSet={sources.avif} sizes={sizes} />
      )}
      {sources.webp && (
        <source type="image/webp" srcSet={sources.webp} sizes={sizes} />
      )}
      <ImageTag
        src={sources.src}
        srcSet={sources.fallback}
        sizes={sizes}
        width={sources.width}
        height={sources.height}
        loading={loading}
        decoding={decoding}
        {...imageProps}
      />
    </picture>
  );
};

/** Starts downloading the file a ResponsiveImage with these sizes will pick (the best format the browser takes). */
export const preloadImage = (
  src: string,
  sizes: string,
  fetchPriority?: "high" | "low" | "auto",
) => {
  const sources = getImageSources(src);
  const modern = sources?.avif ?? sources?.webp;

  if (!sources || !modern) {
    // eslint-disable-next-line id-length -- React preload() option name
    preload(resolveAssetUrl(src), { as: "image", fetchPriority });

    return;
  }

  preload(sources.src, {
    // eslint-disable-next-line id-length -- React preload() option name
    as: "image",
    imageSrcSet: modern,
    imageSizes: sizes,
    type: sources.avif ? "image/avif" : "image/webp",
    fetchPriority,
  });
};
