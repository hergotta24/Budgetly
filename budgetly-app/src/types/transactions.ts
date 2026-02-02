export type Transaction = {
  id: String;
  accountId: String;
  date: String;
  description: String;
  amount: Number;      
  category?: String;
  balance: Number;
};
