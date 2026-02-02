import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { UploadedFile } from "../../types/importedFile";

type ImportState = {
  files : UploadedFile[];
};

const initialState: ImportState = {
  files: [],
};

const importSlice = createSlice({
  name: "import",
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

    clearTransactions: (state: ImportState) => {
      state.files = [];
    },
  },
});

export const { setTransactions, addTransactions, clearTransactions } =
  importSlice.actions;

export default importSlice.reducer;