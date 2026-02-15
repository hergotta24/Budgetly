import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { Category } from "@/types/category";

type CategoriesState = {
  categories: Category[];
};

const initialState: CategoriesState = {
  categories: [{name: "Uncategorized"}],
};

const categoriesSlice = createSlice({
  name: "categories",
  initialState,
  reducers: {
    setCategories: (
      state,
      action: PayloadAction<{ categories: Category[] }>,
    ) => {
      state.categories = action.payload.categories;
    },

    addCategories: (
      state,
      action: PayloadAction<{ categories: Category[] }>
    ) => {
      state.categories.push(...action.payload.categories);
    },

    clearCategories: (state: CategoriesState) => {
      state.categories = [];
    },
  },
});

export const { setCategories, addCategories, clearCategories } =
  categoriesSlice.actions;

export default categoriesSlice.reducer;