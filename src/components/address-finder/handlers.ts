import type { ChangeEvent, KeyboardEvent } from "react";
import { formatPostcode, isPostcodeValid } from "../../utils/address";
import type { AddressSuggestion, FieldKey } from "./data";
import type { FinderCore } from "./use-finder-core";

export const getFieldHandlers = ({
  state,
  setState,
  update,
  emit,
}: FinderCore) => {
  const { draft } = state;

  const setDraftField = (key: FieldKey, fieldValue: string) => {
    const next = { ...state.draft, [key]: fieldValue };

    update({ draft: next });
    emit(next, "manual");
  };

  const handleFieldChange =
    (key: FieldKey) => (event: ChangeEvent<HTMLInputElement>) =>
      setDraftField(
        key,
        key === "postcode"
          ? event.target.value.toUpperCase().slice(0, 8)
          : event.target.value,
      );

  const handleFieldBlur = (key: FieldKey) => () => {
    setState((current) => ({
      ...current,
      touched: { ...current.touched, [key]: 1 },
    }));

    if (key === "postcode" && isPostcodeValid(draft.postcode))
      setDraftField("postcode", formatPostcode(draft.postcode));
  };

  return { handleFieldChange, handleFieldBlur };
};

interface QueryStatus {
  hits: AddressSuggestion[];
  isOpen: boolean;
  isSearching: boolean;
  pick: (hit: AddressSuggestion) => Promise<void>;
}

export const getQueryHandlers = (
  { state, update, blurTimerRef, clearBlurTimer, focusLater }: FinderCore,
  { hits, isOpen, isSearching, pick }: QueryStatus,
) => {
  const handleQueryKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    const count = hits.length;

    if (event.key === "ArrowDown") {
      event.preventDefault();

      if (!isOpen) {
        update({ open: true });

        return;
      }

      if (count)
        update({ highlightedIndex: (state.highlightedIndex + 1) % count });
    } else if (event.key === "ArrowUp") {
      event.preventDefault();

      if (count)
        update({
          highlightedIndex:
            state.highlightedIndex <= 0
              ? count - 1
              : state.highlightedIndex - 1,
        });
    } else if (event.key === "Enter") {
      event.preventDefault();
      const chosen = hits[state.highlightedIndex];

      if (isOpen && state.highlightedIndex >= 0 && chosen) void pick(chosen);
      else if (isOpen && count === 1 && hits[0]) void pick(hits[0]);
    } else if (event.key === "Escape" && (isOpen || isSearching)) {
      event.preventDefault();
      event.stopPropagation();
      update({ open: false, highlightedIndex: -1 });
    }
  };

  return {
    handleQueryKeyDown,
    handleQueryChange: (event: ChangeEvent<HTMLInputElement>) =>
      update({ query: event.target.value, open: true, highlightedIndex: -1 }),
    handleQueryFocus: () => {
      clearBlurTimer();

      if (state.query.trim().length >= 3) update({ open: true });
    },
    handleQueryBlur: () => {
      blurTimerRef.current = window.setTimeout(
        () => update({ open: false, highlightedIndex: -1 }),
        120,
      );
    },
    clearQuery: () => {
      update({ query: "", open: false, highlightedIndex: -1 });
      focusLater("query");
    },
    setActiveIndex: (index: number) => {
      if (state.highlightedIndex !== index) update({ highlightedIndex: index });
    },
  };
};
