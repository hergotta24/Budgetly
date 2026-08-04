import { createSlice } from "@reduxjs/toolkit";
import type { ImportedFile } from "@/types/importedFile";
import { importFiles, removeImportedFile } from "../workspaceActions";

export type ImportsState = {
  imports: ImportedFile[];
};

export const initialImportsState: ImportsState = {
  imports: [],
};

const importsSlice = createSlice({
  name: "imports",
  initialState: initialImportsState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(importFiles, (state, action) => {
        state.imports.push(...action.payload.imports);
      })
      .addCase(removeImportedFile, (state, action) => {
        state.imports = state.imports.filter(
          (item) => item.id !== action.payload.importId,
        );
      });
  },
});

export default importsSlice.reducer;
