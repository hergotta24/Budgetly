import { Transaction } from "./transactions";

export type UploadedFile = {
  fileName: string;
  transactions: Transaction[];
};