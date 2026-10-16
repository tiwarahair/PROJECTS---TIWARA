import type { StudioActions, StudioContext } from "../../core/actions";
import { getCategoryNameError, getNextCategoryColour } from "../../core/model";

export const createCategoryActions = (
  { getState, setState }: StudioContext,
  { openSheet }: StudioActions,
) => {
  const openCategories = () =>
    openSheet("cats", {
      categoriesUi: {
        newName: "",
        newColour: getNextCategoryColour(getState().categories),
        newError: "",
        editId: null,
        editName: "",
        editColour: null,
        editError: "",
      },
    });

  const addCategory = (name: string, colour?: string | null) => {
    const state = getState();
    const error = getCategoryNameError(state, name);

    if (error) return { error };

    const categories = state.categories;
    const id = crypto.randomUUID();

    const category = {
      id,
      name: String(name).trim().slice(0, 40),
      sort: categories.length
        ? Math.max(...categories.map(({ sort }) => sort)) + 1
        : 0,
      colour: colour || getNextCategoryColour(categories),
    };

    setState({ categories: categories.concat([category]) });

    return { id, category };
  };

  return { openCategories, addCategory };
};
