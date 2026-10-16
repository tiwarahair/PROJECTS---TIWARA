import { removeBlock as removeBlockRow } from "../../../../lib/studio-api";
import { ICONS } from "../constants";
import { getBlockTitle } from "../model";
import type {
  ActionSheet,
  BlockedTime,
  SheetKind,
  StudioState,
} from "../types";
import type { StudioContext } from "./context";

interface BlockDeps {
  showToast: (message: string, undo?: () => void) => void;
  openSheet: (type: SheetKind, extra?: Partial<StudioState>) => void;
  openActionSheet: (config: ActionSheet) => void;
}

export const createBlockActions = (
  context: StudioContext,
  { showToast, openSheet, openActionSheet }: BlockDeps,
) => {
  const { setState, isWide } = context;

  const editBlock = (block: BlockedTime) => {
    const isAllDay = block.span === "All day";
    const parts = isAllDay ? ["09:00", "18:00"] : block.span.split(" to ");

    const reason =
      block.note ??
      (block.reason || "")
        .replace(/( · )?Repeats (daily|weekly|monthly)( until [^·]*)?/, "")
        .trim();

    openSheet("block", {
      blockDraft: {
        day: block.dayIndex || 0,
        start: parts[0] ?? "",
        end: parts[1] || parts[0] || "",
        allDay: isAllDay,
        reason,
        frequency: block.frequency || "none",
        ends: block.ends || "never",
        endDayOffset: block.endDayOffset,
        color: block.color || "purple",
        editId: block.id,
      },
    });
  };

  const removeBlock = (block: BlockedTime) =>
    setState({
      confirm: {
        title: "Remove this blocked time?",
        body: `${block.day} · ${block.span} will open up for online booking again.`,
        yesLabel: "Remove",
        noLabel: "Keep it",
        yes: () => {
          const before = context.getState().blocked;

          setState(({ blocked }) => ({
            blocked: blocked.filter(({ id }) => id !== block.id),
            confirm: null,
          }));

          context.sync?.save(() => removeBlockRow(block.id), {
            blocked: before,
          });

          showToast("Blocked time removed");
        },
      },
    });

  const blockActions = (block: BlockedTime) =>
    openActionSheet({
      title: block.reason || "Blocked time",
      subtitle: `${block.day} · ${block.span}`,
      items: [
        { label: "Edit", icon: ICONS.edit, run: () => editBlock(block) },
        {
          label: "Delete",
          icon: ICONS.trash,
          danger: true,
          run: () => removeBlock(block),
        },
      ],
    });

  const blockPop = (
    block: BlockedTime,
    event: { clientX: number; clientY: number },
  ) => {
    if (!isWide()) return blockActions(block);

    const width = 236;
    const height = 150;
    const pad = 12;

    const x = Math.min(
      Math.max(pad, event.clientX - 20),
      window.innerWidth - width - pad,
    );

    const y = Math.min(event.clientY - 10, window.innerHeight - height - pad);

    setState({
      pop: {
        kind: "block",
        title: getBlockTitle(block),
        subtitle: `${block.day} · ${block.span}`,
        x,
        y,
        block,
      },
    });
  };

  return { editBlock, removeBlock, blockActions, blockPop };
};
