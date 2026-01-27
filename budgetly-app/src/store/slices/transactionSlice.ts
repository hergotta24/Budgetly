import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { Transaction } from "../../types/transations";
import type { UploadedFile } from "../../types/importedFile";

type TransactionsState = {
  files : UploadedFile[];
};

const initialState: TransactionsState = {
  files: [],
};

const transactionsSlice = createSlice({
  name: "transactions",
  initialState,
  reducers: {
    setTransactions: (
      state,
      action: PayloadAction<{ files: UploadedFile[] }>,
    ) => {
      state.files = action.payload.files;
    },

    addTransactions: (
      state,
      action: PayloadAction<{ files: UploadedFile[] }>
    ) => {
      state.files.push(...action.payload.files);
    },

    clearTransactions: (state: TransactionsState) => {
      state.files = [];
    },
  },
});

export const { setTransactions, addTransactions, clearTransactions } =
  transactionsSlice.actions;

export default transactionsSlice.reducer;
