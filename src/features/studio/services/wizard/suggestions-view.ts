import type { ChangeEvent } from "react";
import type { ServiceType } from "../../../../types/service-type";
import { TAXONOMY } from "../../core/constants";
import type { WizardContext } from "./context";

export const getSuggestionsView = ({
  wizard,
  setWizard,
  serviceActions,
}: WizardContext) => {
  const query = (wizard.search || "").toLowerCase();
  const categoryFilter = wizard.categoryFilter || "all";

  const isTypeHit = ({ name, synonyms }: ServiceType) =>
    !query ||
    name.toLowerCase().includes(query) ||
    (synonyms || []).some(
      (word) =>
        word.toLowerCase().includes(query) ||
        query.includes(word.toLowerCase()),
    );

  const catalogue = wizard.pickGroup
    ? []
    : TAXONOMY.filter(
        ({ id }) => categoryFilter === "all" || id === categoryFilter,
      )
        .map(({ id, name, types }) => ({
          key: id,
          category: name,
          items: types
            .filter(
              (type) =>
                !type.isOther &&
                (isTypeHit(type) ||
                  (!!query && name.toLowerCase().includes(query))),
            )
            .map((type) => ({
              key: type.id,
              name: type.name,
              pick: () => serviceActions.pickSuggestion(type),
            })),
        }))
        .filter(({ items }) => items.length);

  return {
    search: wizard.search,
    onSearch: (event: ChangeEvent<HTMLInputElement>) =>
      setWizard({ search: event.target.value }),
    isSearching: !!query,
    clearSearch: () => setWizard({ search: "" }),
    categoryChips: [{ id: "all", label: "All" }]
      .concat(TAXONOMY.map(({ id, name }) => ({ id, label: name })))
      .map(({ id, label }) => ({
        key: id,
        label,
        isOn: categoryFilter === id,
        pick: () => setWizard({ categoryFilter: id }),
      })),
    catalogue,
    hasNoResults: catalogue.length === 0,
    isSuggestionsOpen: !!wizard.suggestionsOpen,
    openSuggestions: () =>
      setWizard({
        suggestionsOpen: true,
        search: "",
        categoryFilter: "all",
        pickGroup: false,
      }),
    closeSuggestions: () => setWizard({ suggestionsOpen: false }),
    suggestionKey: (event: { key: string; stopPropagation: () => void }) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        setWizard({ suggestionsOpen: false });
      }
    },
  };
};
