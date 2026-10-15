import { useEffect, useState } from "react";

/** True once the image at src has loaded (or failed), so a CSS background can wait for it. */
export const useImageLoaded = (src: string) => {
  const [loadedSrc, setLoadedSrc] = useState<string>();

  useEffect(() => {
    if (!src) return;

    const image = new Image();
    const markLoaded = () => setLoadedSrc(src);

    image.onload = markLoaded;
    image.onerror = markLoaded;
    image.src = src;

    return () => {
      image.onload = null;
      image.onerror = null;
    };
  }, [src]);

  return !src || loadedSrc === src;
};
