export type Transaction = {
  id: string;
  accountId: string;
  date: String;        // ISO string like "2026-01-22"
  description: string;
  amount: number;      // negative = expense, positive = income
  category?: string;
};
