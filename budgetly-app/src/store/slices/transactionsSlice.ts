import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { Transaction } from "../../types/transaction";
import { importFiles, removeImportedFile } from "../workspaceActions";

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
  extraReducers: (builder) => {
    builder
      .addCase(importFiles, (state, action) => {
        state.transactions.push(...action.payload.transactions);
      })
      .addCase(removeImportedFile, (state, action) => {
        state.transactions = state.transactions.filter(
          (transaction) => transaction.importId !== action.payload.importId,
        );
      });
  },
});

export const { setTransactions, addTransactions, clearTransactions } =
  transactionsSlice.actions;

export default transactionsSlice.reducer;
