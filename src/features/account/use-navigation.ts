import { useCallback, useEffect } from "react";
import { ACCOUNT_TAB_EVENT } from "../../components/site-menu";
import { useUnsavedChanges } from "../../hooks/use-unsaved-changes";
import { getSearchParams } from "../../utils/page-flags";
import { SECTION_IDS } from "./data";
import { EMPTY_PASSWORD } from "./forms";
import { readSection } from "./initial-state";
import { WIDE_PX } from "./state";
import { getDiscardPatch, hasUnsavedEdits } from "./unsaved";
import type { AccountCore } from "./use-core";
import type { AccountFeedback } from "./use-feedback";

export const useAccountNavigation = (
  {
    searchParams,
    stateRef,
    dataRef,
    setState,
    forms,
    navigate,
    returnFocus,
  }: AccountCore,
  { focusLater }: AccountFeedback,
) => {
  /** Switch section: replace the URL on wide screens, push it (and scroll up) on narrow ones. */
  const showSection = useCallback(
    (id: string | null) => {
      if (id && !SECTION_IDS.includes(id)) return;

      const { sectionId: previous, wide } = stateRef.current;

      setState(
        {
          sectionId: id,
          edit: null,
          allergyEdit: -1,
          addressForm: null,
        },
        () => focusLater(id ? "title" : `row:${previous}`),
      );

      const params = new URLSearchParams(searchParams);

      params.delete("tab");

      if (id) params.set("section", id);
      else params.delete("section");

      const search = params.toString();

      navigate(
        { search: search ? `?${search}` : "" },
        { replace: wide, preventScrollReset: wide },
      );

      if (!wide) window.scrollTo(0, 0);
    },
    [focusLater, navigate, searchParams, setState, stateRef],
  );

  /** "Discard changes?": Discard closes the edit forms, then carries on. */
  const askDiscard = useCallback(
    (proceed: () => void, keep?: () => void) => {
      returnFocus.current = document.activeElement;

      setState({
        dialog: {
          kind: "discard",
          then: () => {
            forms.edit.clearErrors();
            forms.password.reset(EMPTY_PASSWORD);
            setState({ ...getDiscardPatch(stateRef.current), dialog: null });
            proceed();
          },
          keep,
        },
      });
    },
    [setState, forms, returnFocus, stateRef],
  );

  const getFormValues = useCallback(
    () => ({
      draft: forms.edit.getValues(),
      password: forms.password.getValues(),
      address: forms.address.getValues(),
    }),
    [forms],
  );

  // an open edit with changes asks before it's dropped
  const goToSection = useCallback(
    (id: string | null) => {
      if (!hasUnsavedEdits(stateRef.current, getFormValues(), dataRef.current))
        return showSection(id);

      askDiscard(() => showSection(id));
    },
    [askDiscard, showSection, getFormValues, stateRef, dataRef],
  );

  useEffect(() => {
    const handleTab = (event: Event) =>
      goToSection((event as CustomEvent<string>).detail);

    // popstate fires before the router has re-rendered with the new location, so the window URL is the current one here
    const handlePop = () =>
      setState({ sectionId: readSection(getSearchParams()) });

    const handleResize = () => {
      const wide = window.innerWidth >= WIDE_PX;

      if (wide !== stateRef.current.wide) setState({ wide });
    };

    window.addEventListener(ACCOUNT_TAB_EVENT, handleTab);
    window.addEventListener("popstate", handlePop);
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener(ACCOUNT_TAB_EVENT, handleTab);
      window.removeEventListener("popstate", handlePop);
      window.removeEventListener("resize", handleResize);
    };
  }, [goToSection, setState, stateRef]);

  const hasUnsaved = useCallback(
    () => hasUnsavedEdits(stateRef.current, getFormValues(), dataRef.current),
    [getFormValues, stateRef, dataRef],
  );

  const blocker = useUnsavedChanges(hasUnsaved);

  // leaving the page (links, back) with unsaved edits
  useEffect(() => {
    if (blocker.state !== "blocked" || stateRef.current.dialog) return;

    askDiscard(blocker.proceed, blocker.reset);
  }, [askDiscard, blocker, stateRef]);

  return { goToSection };
};
