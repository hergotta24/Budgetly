import type { Category } from "./category";

export type Transaction = {
  id: string;
  alias?: string;
  accountId: string;
  date: string;
  description: string;
  amount: number;
  category?: Category;
  balance: number;
  fromFile: string;
  importId?: string;
};

