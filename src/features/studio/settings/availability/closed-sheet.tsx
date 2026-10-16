import { joinClassNames } from "../../../../utils/class-names";
import type { StudioState } from "../../core/types";
import type { StudioController } from "../../core/use-studio";
import styles from "../../../../styles/features/studio/settings/availability/closed-sheet.module.css";
import fields from "../../../../styles/features/studio/settings/availability/sheet-fields.module.css";
import { saveClosedPeriod } from "../../../../lib/studio-api";
import { formatClosedSpan } from "../../core/blocked-time";

export const ClosedSheet = ({ studio }: { studio: StudioController }) => {
  const { state, setState, actions, context } = studio;
  const draft = state.closedDraft;

  const setDraft = (patch: Partial<StudioState["closedDraft"]>) =>
    setState(({ closedDraft }) => ({
      closedDraft: { ...closedDraft, ...patch },
    }));

  const isReady = !!(draft.from && draft.to);

  const save = () => {
    if (!isReady) return;

    const item = {
      id: draft.editId || crypto.randomUUID(),
      from: draft.from,
      to: draft.to,
      span: formatClosedSpan(draft.from, draft.to),
      reason: draft.reason,
    };

    const before = state.closed;

    setState({
      closed: draft.editId
        ? state.closed.map((period) =>
            period.id === draft.editId ? item : period,
          )
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
      draft.editId
        ? "Closed period updated"
        : "Closed period added. Online booking blocked",
    );

    actions.closeSheet();
  };

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
            value={draft.from}
            onChange={(event) => setDraft({ from: event.target.value })}
          />
        </label>
        <label className={styles.block}>
          <span className={fields.fieldLabel}>To</span>
          <input
            className={styles.dateInput}
            type="date"
            value={draft.to}
            onChange={(event) => setDraft({ to: event.target.value })}
          />
        </label>
      </div>
      <label className={fields.field}>
        <span className={fields.fieldLabel}>Reason</span>
        <input
          className={fields.input}
          value={draft.reason}
          onChange={(event) => setDraft({ reason: event.target.value })}
          placeholder="e.g. Holiday (optional)"
        />
      </label>
      <button
        className={joinClassNames(fields.submit, !isReady && fields.submitOff)}
        onClick={save}
        disabled={!isReady}
      >
        Add closed period
      </button>
    </>
  );
};
