import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { joinClassNames } from "../../../../utils/class-names";
import type { StudioController } from "../../core/use-studio";
import styles from "../../../../styles/features/studio/settings/availability/closed-sheet.module.css";
import fields from "../../../../styles/features/studio/settings/availability/sheet-fields.module.css";
import { saveClosedPeriod } from "../../../../lib/studio-api";
import { formatClosedSpan } from "../../core/blocked-time";
import { closedSchema } from "./closed-schema";
import type { ClosedValues } from "./closed-schema";

export const ClosedSheet = ({ studio }: { studio: StudioController }) => {
  const { state, setState, actions, context } = studio;
  const { from, to, reason, editId } = state.closedDraft;

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isValid },
  } = useForm<ClosedValues>({
    defaultValues: { from, to, reason },
    resolver: zodResolver(closedSchema),
    mode: "onChange",
  });

  useEffect(() => {
    const subscription = watch((values) =>
      setState(({ closedDraft }) => ({
        closedDraft: { ...closedDraft, ...values },
      })),
    );

    return () => subscription.unsubscribe();
  }, [watch, setState]);

  const save = handleSubmit((values) => {
    const item = {
      id: editId || crypto.randomUUID(),
      from: values.from,
      to: values.to,
      span: formatClosedSpan(values.from, values.to),
      reason: values.reason,
    };

    const before = state.closed;

    setState({
      closed: editId
        ? state.closed.map((period) => (period.id === editId ? item : period))
        : state.closed.concat([item]),
    });

    context.sync?.save(
      (stylistId) =>
        saveClosedPeriod({
          id: item.id,
          stylist_id: stylistId,
          starts_on: item.from,
          ends_on: item.to,
          reason: item.reason,
        }),
      { closed: before },
    );

    actions.showToast(
      editId
        ? "Closed period updated"
        : "Closed period added. Online booking blocked",
    );

    actions.closeSheet();
  });

  return (
    <>
      <div className={styles.closedIntro}>
        Online bookings are not possible during closed periods. Existing
        bookings are unaffected.
      </div>
      <div className={styles.twoCols}>
        <label className={styles.block}>
          <span className={fields.fieldLabel}>From</span>
          <input
            className={styles.dateInput}
            type="date"
            {...register("from")}
          />
        </label>
        <label className={styles.block}>
          <span className={fields.fieldLabel}>To</span>
          <input
            className={styles.dateInput}
            type="date"
            aria-invalid={errors.to ? "true" : "false"}
            {...register("to")}
          />
          {errors.to?.message && (
            <span className={fields.fieldError} role="alert">
              {errors.to.message}
            </span>
          )}
        </label>
      </div>
      <label className={fields.field}>
        <span className={fields.fieldLabel}>Reason</span>
        <input
          className={fields.input}
          {...register("reason")}
          placeholder="e.g. Holiday (optional)"
        />
      </label>
      <button
        className={joinClassNames(fields.submit, !isValid && fields.submitOff)}
        onClick={() => void save()}
        disabled={!isValid}
      >
        {editId ? "Save closed period" : "Add closed period"}
      </button>
    </>
  );
};
