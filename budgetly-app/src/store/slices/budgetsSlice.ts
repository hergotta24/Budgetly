import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { BudgetCategory } from "@/types/budget";

export type BudgetsState = {
  budgets: BudgetCategory[];
};

export const initialBudgetsState: BudgetsState = {
  budgets: [],
};

const budgetsSlice = createSlice({
  name: "budgets",
  initialState: initialBudgetsState,
  reducers: {
    addBudget: (state, action: PayloadAction<BudgetCategory>) => {
      state.budgets.push(action.payload);
    },
    updateBudgetName: (
      state,
      action: PayloadAction<{ id: string; name: string }>,
    ) => {
      const budget = state.budgets.find((item) => item.id === action.payload.id);
      if (budget) budget.name = action.payload.name;
    },
    updateBudgetLimit: (
      state,
      action: PayloadAction<{ id: string; limit: number }>,
    ) => {
      const budget = state.budgets.find((item) => item.id === action.payload.id);
      if (budget) budget.limit = action.payload.limit;
    },
    removeBudget: (state, action: PayloadAction<{ id: string }>) => {
      state.budgets = state.budgets.filter(
        (item) => item.id !== action.payload.id,
      );
    },
  },
});

export const {
  addBudget,
  updateBudgetName,
  updateBudgetLimit,
  removeBudget,
} = budgetsSlice.actions;

export default budgetsSlice.reducer;
