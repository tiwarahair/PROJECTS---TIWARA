// State and behaviour of the one address field.
import { useIsSlow } from "../../hooks/use-is-slow";
import { getAddressLines } from "../../utils/address";
import type { FieldKey, UseAddressFinderOptions } from "./data";
import { getFieldHandlers, getQueryHandlers } from "./handlers";
import { getFinderModes } from "./modes";
import { getFieldErrors } from "./state";
import { useFinderCore } from "./use-finder-core";
import { useFinderEffects } from "./use-finder-effects";

export const useAddressFinder = (options: UseAddressFinderOptions) => {
  const { value, showErrors = false } = options;
  const core = useFinderCore(options);

  useFinderEffects(core, options);

  const { state, places, queryRef, editRef, fieldRefs } = core;
  const { pick, toManual, toFind } = getFinderModes(core);
  const hits = state.mode === "find" ? state.hits : [];

  const isOpen =
    state.open &&
    state.query.trim().length >= 3 &&
    state.searchedQuery === state.query.trim();

  const isSearching = useIsSlow(
    !!places &&
      state.open &&
      state.mode === "find" &&
      state.query.trim().length >= 3 &&
      state.searchedQuery !== state.query.trim(),
  );

  const isErrorShown = (key: FieldKey | "query") =>
    !!(showErrors || state.touched[key]);

  const queryError =
    state.mode === "find" && isErrorShown("query") && !value?.line1
      ? "Enter your address or postcode, or enter it manually"
      : "";

  const { handleFieldChange, handleFieldBlur } = getFieldHandlers(core);

  return {
    state,
    hits,
    isOpen,
    isSearching,
    queryError,
    fieldErrors: getFieldErrors(state.draft),
    isErrorShown,
    summaryLines: getAddressLines(state.sum || state.draft),
    queryRef,
    editRef,
    fieldRefs,
    pick,
    toManual,
    toFind,
    handleFieldChange,
    handleFieldBlur,
    ...getQueryHandlers(core, { hits, isOpen, isSearching, pick }),
  };
};
