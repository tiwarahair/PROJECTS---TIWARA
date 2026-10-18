import type { ReactNode } from "react";
import { joinClassNames } from "../../utils/class-names";
import shared from "../../styles/components/checkout/index.module.css";

export const Chip = ({
  isOn,
  className,
  onPick,
  children,
}: {
  isOn: boolean;
  className: string | undefined;
  onPick: () => void;
  children: ReactNode;
}) => (
  <button
    className={joinClassNames(className, isOn ? shared.chipOn : shared.chipOff)}
    onClick={onPick}
    aria-pressed={isOn ? "true" : "false"}
  >
    {children}
  </button>
);

/** Radio ring and dot. */
export const RadioMark = ({
  isOn,
  className,
}: {
  isOn: boolean;
  className: string | undefined;
}) => (
  <span
    className={joinClassNames(className, isOn ? shared.ringOn : shared.ringOff)}
  >
    <span
      className={joinClassNames(
        shared.radioDot,
        isOn ? shared.dotOn : shared.dotOff,
      )}
    ></span>
  </span>
);
