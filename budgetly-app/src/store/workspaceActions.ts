import { createAction } from "@reduxjs/toolkit";
import type { ImportedFile } from "@/types/importedFile";
import type { Transaction } from "@/types/transaction";

export const importFiles = createAction<{
  transactions: Transaction[];
  imports: ImportedFile[];
}>("workspace/importFiles");

export const removeImportedFile = createAction<{ importId: string }>(
  "workspace/removeImportedFile",
);
