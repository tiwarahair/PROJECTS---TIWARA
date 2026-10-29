import { joinClassNames } from "../../utils/class-names";
import type { DetailRow } from "./view";
import flow from "../../styles/components/checkout/flow.module.css";
import shared from "../../styles/components/checkout/index.module.css";

/** Label (+ sub line) and amount. */
export const AmountRow = ({
  row: { label, subtitle, value, isAlert },
  subtitleClassName,
}: {
  row: DetailRow;
  subtitleClassName: string | undefined;
}) => (
  <div className={flow.row}>
    <span className={shared.minWidth}>
      <span className={flow.rowLabel}>{label}</span>
      {!!subtitle && <span className={subtitleClassName}>{subtitle}</span>}
    </span>
    <span
      className={joinClassNames(
        flow.rowValue,
        isAlert ? flow.valueAlert : flow.valueNormal,
      )}
    >
      {value}
    </span>
  </div>
);
