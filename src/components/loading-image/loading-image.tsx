import { useState } from "react";
import type { ImgHTMLAttributes } from "react";
import { joinClassNames } from "../../utils/class-names";
import styles from "../../styles/components/loading-image/loading-image.module.css";

/** The shimmer-then-fade class, for elements that show an image as a CSS background. */
export const loadingImageClassName = styles.image;

export type LoadingImageProps = ImgHTMLAttributes<HTMLImageElement>;

/** An image that shimmers until it has loaded, then fades in. */
export const LoadingImage = ({
  src,
  alt,
  className,
  onLoad,
  onError,
  ...imageProps
}: LoadingImageProps) => {
  const [loadedSrc, setLoadedSrc] = useState<string>();

  return (
    <img
      {...imageProps}
      src={src}
      alt={alt}
      className={joinClassNames(styles.image, className)}
      data-loaded={loadedSrc === src ? "" : undefined}
      onLoad={(event) => {
        setLoadedSrc(src);
        onLoad?.(event);
      }}
      onError={(event) => {
        setLoadedSrc(src);
        onError?.(event);
      }}
    />
  );
};
