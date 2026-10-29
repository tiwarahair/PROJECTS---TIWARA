import shared from "../../styles/components/checkout/index.module.css";

export const getViewAnimation = (direction: number) => {
  if (direction === 0) return undefined;

  return direction > 0 ? shared.animForward : shared.animBack;
};
