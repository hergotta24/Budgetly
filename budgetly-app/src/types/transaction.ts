import { Category } from "./category";

export type Transaction = {
  id: String;
  alias?: String;
  accountId: String;
  date: String;
  description: String;
  amount: Number;      
  category?: Category;
  balance: Number;
  fromFile: String;
};

