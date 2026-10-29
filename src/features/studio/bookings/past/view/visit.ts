import { formatMoney } from "../../../../../utils/money";
import { PAST_TONE } from "../../../core/constants";
import { getLinkDue } from "../../checkout-label";
import { getPastTime } from "./checkout";
import type { PastContext } from "./context";

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
  const linkDue = isCompleted ? getLinkDue(row) : null;

  const getOutLabel = () => {
    if (linkDue !== null) return "Awaiting";

    if (isCompleted || !isKept) return "Paid";

    return row.feePending && isFresh ? "Fee pending" : "Fee kept";
  };

  const getOutValue = () => {
    if (linkDue !== null) return formatMoney(linkDue);

    if (isCompleted) return `£${row.price}`;

    return isKept ? row.feeLabel : "£0";
  };

  return {
    service: row.service,
    when: row.when,
    time: getPastTime(state, row),
    priceLabel: `£${row.price}`,
    isStruck: !isCompleted,
    status: row.status,
    badgeBackground: tone.background,
    badgeColor: tone.color,
    badgeIcon: tone.icon,
    totalLabel: `£${row.price}`,
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
