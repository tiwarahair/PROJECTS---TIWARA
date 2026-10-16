import shared from "../../../styles/components/earnings/overlays/index.module.css";

export const getAmountClass = (amount: number) =>
  amount < 0 ? shared.amountNegative : shared.amountPositive;
