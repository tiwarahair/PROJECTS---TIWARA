import type { CSSProperties } from "react";
import { joinClassNames } from "../../utils/class-names";
import styles from "./avatar.module.css";

/** Circular photo or initials fallback (crimson tint). */
export interface AvatarProps {
  src?: string;
  name?: string;
  /** Pixel size, default 40 */
  size?: number;
  style?: CSSProperties;
  className?: string;
}

export const Avatar = ({
  src,
  name = "",
  size = 40,
  style,
  className,
}: AvatarProps) => {
  const initials = name
    .split(" ")
    .map((word) => word[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  // --avatar-size: the size prop is any pixel value
  const sizeStyle = { "--avatar-size": `${size}px`, ...style } as CSSProperties;

  if (src)
    return (
      <img
        src={src}
        alt={name}
        className={joinClassNames(styles.avatar, className)}
        style={sizeStyle}
      />
    );

  return (
    <span
      className={joinClassNames(styles.avatar, styles.initials, className)}
      style={sizeStyle}
    >
      {initials}
    </span>
  );
};
