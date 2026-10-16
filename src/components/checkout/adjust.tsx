import { zodResolver } from "@hookform/resolvers/zod";
import { CircleAlert } from "lucide-react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { joinClassNames } from "../../utils/class-names";
import { formatMoney } from "../../utils/money";
import { ADJUST_REASONS } from "./data";
import type { CheckoutLine } from "./data";
import { getAdjustDelta, getAdjustSchema } from "./schemas";
import type { AdjustValues } from "./schemas";
import type { CheckoutController } from "./use-checkout";
import flow from "../../styles/components/checkout/flow.module.css";
import shared from "../../styles/components/checkout/checkout-sheet.module.css";

interface AdjustPanelProps {
  line: CheckoutLine;
  checkout: CheckoutController;
}

const getAdjustValues = ({
  adjustment,
  base,
  reason,
}: CheckoutLine): AdjustValues => {
  if (!adjustment) return { amount: "", reason: "", other: "" };

  const isListed = ADJUST_REASONS.includes(reason);

  return {
    amount: String(base + adjustment),
    reason: isListed ? reason : "Other",
    other: isListed ? "" : reason,
  };
};

const getAdjustPreview = (amount: string, base: number) => {
  if (!amount.trim()) return "";

  const delta = getAdjustDelta(amount, base);

  if (delta === 0) return "Same as booked price";

  return (
    (delta < 0 ? "Lowered by " : "Raised by ") + formatMoney(Math.abs(delta))
  );
};

export const AdjustPanel = ({ line, checkout }: AdjustPanelProps) => {
  const { state, setState, showToast } = checkout;

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<AdjustValues>({
    defaultValues: getAdjustValues(line),
    resolver: zodResolver(getAdjustSchema(line.base)),
  });

  const [amount, reason] = useWatch({ control, name: ["amount", "reason"] });

  const error =
    errors.amount?.message ?? errors.reason?.message ?? errors.other?.message;

  const setLine = (patch: Partial<CheckoutLine>) =>
    setState({
      lines: state.lines.map((item) =>
        item.id === line.id ? { ...item, ...patch } : item,
      ),
      adjustingLineId: null,
    });

  const apply = handleSubmit((values) => {
    setLine({
      adjustment: getAdjustDelta(values.amount, line.base),
      reason: values.reason === "Other" ? values.other.trim() : values.reason,
    });

    showToast("Price adjusted");
  });

  return (
    <div
      className={joinClassNames(flow.adjustPanel, shared.motion)}
      data-ck-m="1"
    >
      <div className={flow.strong15}>
        {`Adjust ${line.name} (${formatMoney(line.base)})`}
      </div>
      <label className={shared.field} htmlFor={`ck-adjust-${line.id}`}>
        <span className={shared.fieldLabel}>New price</span>
        <span className={flow.moneyWrap}>
          <span className={shared.poundSign}>£</span>
          <Controller
            name="amount"
            control={control}
            render={({ field }) => (
              <input
                {...field}
                id={`ck-adjust-${line.id}`}
                className={flow.moneyInput}
                inputMode="decimal"
                onChange={(event) =>
                  field.onChange(
                    event.target.value.replace(/[^0-9.]/g, "").slice(0, 7),
                  )
                }
                placeholder="0.00"
              />
            )}
          />
        </span>
      </label>
      <label className={shared.field}>
        <span className={shared.fieldLabel}>Reason</span>
        <select className={flow.select} {...register("reason")}>
          <option value="">Choose a reason</option>
          {ADJUST_REASONS.map((listed) => (
            <option key={listed} value={listed}>
              {listed}
            </option>
          ))}
        </select>
        <span className={shared.muted135}>Shown on the receipt.</span>
      </label>
      {reason === "Other" && (
        <input
          className={flow.textInput}
          {...register("other")}
          maxLength={60}
          aria-label="Describe the reason"
          placeholder="Describe the reason"
        />
      )}
      {!!error && (
        <div className={flow.adjustError} role="alert">
          <CircleAlert
            className={shared.iconTop2}
            size={15}
            strokeWidth={1.5}
          />
          {error}
        </div>
      )}
      <div className={flow.adjustFoot}>
        <div className={flow.adjustPreview}>
          {getAdjustPreview(amount, line.base)}
        </div>
        {!!line.adjustment && (
          <button
            className={flow.adjustReset}
            onClick={() => {
              setLine({ adjustment: 0, reason: "" });
              showToast("Adjustment removed");
            }}
          >
            Remove adjustment
          </button>
        )}
        <button
          className={flow.adjustCancel}
          onClick={() => setState({ adjustingLineId: null })}
        >
          Cancel
        </button>
        <button className={flow.adjustApply} onClick={() => void apply()}>
          Apply
        </button>
      </div>
    </div>
  );
};
