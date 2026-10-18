import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { joinClassNames } from "../../../../../utils/class-names";
import type { StudioState } from "../../../core/types";
import type { StudioController } from "../../../core/use-studio";
import fields from "../../../../../styles/features/studio/settings/availability/sheet-fields.module.css";
import { blockSchema, isBlockTimeValid } from "../block-schema";
import type { BlockValues } from "../block-schema";
import { DayPicker } from "./day-picker";
import { RepeatFields } from "./repeat-fields";
import { saveBlockDraft } from "./save";
import { TimeFields } from "./time-fields";

export { EndDateDialog } from "./end-date-dialog";

export const BlockSheet = ({ studio }: { studio: StudioController }) => {
  const { state, setState } = studio;
  const draft = state.blockDraft;

  const setDraft = (patch: Partial<StudioState["blockDraft"]>) =>
    setState(({ blockDraft }) => ({ blockDraft: { ...blockDraft, ...patch } }));

  const {
    trigger,
    formState: { errors },
  } = useForm<BlockValues>({
    values: { allDay: !!draft.allDay, start: draft.start, end: draft.end },
    resetOptions: { keepErrors: true },
    resolver: zodResolver(blockSchema),
  });

  useEffect(() => {
    void trigger();
  }, [draft.allDay, draft.start, draft.end, trigger]);

  const isDisabled = !isBlockTimeValid(draft);

  return (
    <>
      <DayPicker studio={studio} setDraft={setDraft} />
      <TimeFields
        draft={draft}
        setDraft={setDraft}
        endError={errors.end?.message}
      />
      <RepeatFields studio={studio} setDraft={setDraft} />
      <label className={fields.field}>
        <span className={fields.fieldLabel}>Reason</span>
        <input
          className={fields.input}
          value={draft.reason}
          onChange={(event) => setDraft({ reason: event.target.value })}
          placeholder="e.g. Lunch (optional)"
        />
      </label>
      <button
        className={joinClassNames(
          fields.submit,
          isDisabled && fields.submitOff,
        )}
        onClick={() => saveBlockDraft(studio)}
        disabled={isDisabled}
      >
        Block this time
      </button>
    </>
  );
};
