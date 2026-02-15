import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { Transaction } from "../../types/transaction";

type TransactionsState = {
  transactions: Transaction[];
};

const initialState: TransactionsState = {
  transactions: [],
};

const transactionsSlice = createSlice({
  name: "transactions",
  initialState,
  reducers: {
    setTransactions: (
      state,
      action: PayloadAction<{ transactions: Transaction[] }>,
    ) => {
      state.transactions = action.payload.transactions;
    },

    addTransactions: (
      state,
      action: PayloadAction<{ transactions: Transaction[] }>
    ) => {
      state.transactions.push(...action.payload.transactions);
    },

    clearTransactions: (state: TransactionsState) => {
      state.transactions = [];
    },
  },
});

export const { setTransactions, addTransactions, clearTransactions } =
  transactionsSlice.actions;

export default transactionsSlice.reducer;