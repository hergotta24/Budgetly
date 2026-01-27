import { Transaction } from "./transations";

export type UploadedFile = {
  fileName: string;
  transactions: Transaction[];
};