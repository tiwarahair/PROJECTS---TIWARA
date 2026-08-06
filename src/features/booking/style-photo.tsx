import { useEffect, useState } from "react";
import { cx } from "../../utils/class-names";

export interface StylePhotoProps {
  /** Null while the chosen style has no photography. */
  src: string | null;
  alt: string;
}

/**
 * Cross-fades between looks. A new source is preloaded before it reaches the
 * DOM, so the outgoing photo stays put instead of flashing the empty panel
 * while the next one downloads. At most two layers are ever mounted: the
 * outgoing one underneath, the incoming one fading in over it.
 */
export function StylePhoto({ src, alt }: StylePhotoProps) {
  const [layers, setLayers] = useState<string[]>(() => (src ? [src] : []));

  useEffect(() => {
    if (!src || layers[layers.length - 1] === src) return;

    let cancelled = false;
    const show = () => {
      if (!cancelled) setLayers((current) => [...current.slice(-1), src]);
    };

    const image = new Image();
    image.src = src;
    // A cached image can be complete before the listener would ever fire.
    if (image.complete) show();
    else image.addEventListener("load", show, { once: true });

    return () => {
      cancelled = true;
      image.removeEventListener("load", show);
    };
  }, [src, layers]);

  if (!layers.length) return null;

  return (
    <>
      {layers.map((url, index) => (
        <img
          key={url}
          className={cx("bp-style-photo", index > 0 && "bp-style-photo--enter")}
          src={url}
          alt={index === layers.length - 1 ? alt : ""}
          aria-hidden={index !== layers.length - 1}
          // Once the incoming layer is fully opaque the outgoing one is
          // redundant, so it is dropped rather than left stacked.
          onAnimationEnd={() => setLayers((current) => current.slice(-1))}
        />
      ))}
    </>
  );
}
