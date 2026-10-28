import { PAST_TONE } from "../../../core/constants";
import { getPastTime } from "./checkout";
import type { PastContext } from "./context";
import { formatMoney } from "../../../../../utils/money";

const BLANK_TONE = { background: "", color: "", icon: null, meta: "" };

export const getVisitView = ({
  state,
  actions,
  row,
  isCompleted,
  isFresh,
  isKept,
}: PastContext) => {
  const tone = PAST_TONE[row.status] ?? BLANK_TONE;

  const getOutLabel = () => {
    if (isCompleted || !isKept) return "Paid";

    return row.feePending && isFresh ? "Fee pending" : "Fee kept";
  };

  const getOutValue = () => {
    if (isCompleted) return `${formatMoney(row.price)}`;

    return isKept ? row.feeLabel : "£0";
  };

  return {
    service: row.service,
    when: row.when,
    time: getPastTime(state, row),
    priceLabel: `${formatMoney(row.price)}`,
    isStruck: !isCompleted,
    status: row.status,
    badgeBackground: tone.background,
    badgeColor: tone.color,
    badgeIcon: tone.icon,
    totalLabel: `${formatMoney(row.price)}`,
    outLabel: getOutLabel(),
    outValue: getOutValue(),
    canRebook: !!row.client,
    rebook: () =>
      actions.rebookFrom({
        service: row.service,
        client: row.client,
        price: row.price,
      }),
  };
};
