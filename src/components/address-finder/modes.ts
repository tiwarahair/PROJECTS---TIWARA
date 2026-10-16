import { toPlaceAddress } from "../../lib/google-maps";
import type { AddressSuggestion } from "./data";
import { getBlank, getManualDraft } from "./state";
import type { FinderCore } from "./use-finder-core";

export const getFinderModes = ({
  state,
  update,
  sessionRef,
  emit,
  focusLater,
}: FinderCore) => {
  /** Fetches the picked place's address parts and location (this ends the billing session). */
  const pick = async (hit: AddressSuggestion) => {
    const place = hit.prediction.toPlace();

    const fetched = await place
      .fetchFields({ fields: ["addressComponents", "location"] })
      .then(() => true)
      .catch(() => false);

    sessionRef.current = null;

    if (!fetched) return toManual();

    const found = toPlaceAddress(
      (place.addressComponents ?? []).map(({ longText, types }) => ({
        text: longText ?? "",
        types,
      })),
      place.location?.toJSON() ?? null,
    );

    const { line1, line2, town, postcode } = found;
    const draft = { line1, line2, town, postcode };

    update({
      mode: "summary",
      sum: draft,
      draft,
      query: "",
      open: false,
      highlightedIndex: -1,
      touched: {},
    });

    emit(draft, "pick", found);
    focusLater("edit");
  };

  const toManual = (options: { showLine2?: boolean } = {}) => {
    const draft = getManualDraft(state.sum, state.query);
    const showLine2 = options.showLine2 || !!draft.line2;

    update({
      mode: "manual",
      draft,
      showLine2,
      open: false,
      highlightedIndex: -1,
      touched: {},
    });

    emit(draft, "manual");
    focusLater(options.showLine2 ? "line2" : "line1");
  };

  const toFind = () => {
    update({
      mode: "find",
      sum: null,
      draft: getBlank(),
      query: "",
      open: false,
      showLine2: false,
      touched: {},
    });

    emit(null);
    focusLater("query");
  };

  return { pick, toManual, toFind };
};
