import styles from "./page.module.css";

const navItems = [
  { label: "Import", icon: "upload", active: false },
  { label: "Transactions", icon: "list", active: true },
  { label: "Budget", icon: "wallet", active: false },
  { label: "Dashboard", icon: "grid", active: false },
  { label: "Spending", icon: "card", active: false },
  { label: "Export", icon: "download", active: false },
];

const topIcons = ["twitter", "linkedin", "moon"];

const filters = {
  categories: ["All Categories", "Groceries", "Income", "Bills", "Dining Out", "Utilities"],
  accounts: ["All Accounts", "Checking", "Savings", "Credit Card"],
};

const transactions = [
  {
    date: "2023-10-26",
    description: "Groceries at SuperMart",
    category: "Groceries",
    amount: -75.2,
    account: "Checking",
  },
  {
    date: "2023-10-25",
    description: "Monthly Salary",
    category: "Income",
    amount: 3500,
    account: "Savings",
  },
  {
    date: "2023-10-24",
    description: "Electricity Bill",
    category: "Bills",
    amount: -120.5,
    account: "Checking",
  },
  {
    date: "2023-10-23",
    description: "Dinner with friends",
    category: "Dining Out",
    amount: -45,
    account: "Credit Card",
  },
  {
    date: "2023-10-22",
    description: "Internet Service",
    category: "Utilities",
    amount: -60,
    account: "Checking",
  },
  {
    date: "2023-10-21",
    description: "Freelance Payment",
    category: "Income",
    amount: 800,
    account: "Savings",
  },
  {
    date: "2023-10-20",
    description: "Coffee",
    category: "Dining Out",
    amount: -4.5,
    account: "Checking",
  },
];

const icons: Record<string, any> = {
  upload: (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M12 16V6" />
      <path d="m7 11 5-5 5 5" />
      <path d="M4 18h16" />
    </svg>
  ),
  list: (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M9 6h11" />
      <path d="M9 12h11" />
      <path d="M9 18h11" />
      <path d="M4 6h.01" />
      <path d="M4 12h.01" />
      <path d="M4 18h.01" />
    </svg>
  ),
  wallet: (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M4 7h16a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7Z" />
      <path d="M16 11h4v2h-4z" />
      <path d="M4 7l2-3h14" />
    </svg>
  ),
  grid: (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect x="4" y="4" width="7" height="7" rx="1" />
      <rect x="13" y="4" width="7" height="7" rx="1" />
      <rect x="4" y="13" width="7" height="7" rx="1" />
      <rect x="13" y="13" width="7" height="7" rx="1" />
    </svg>
  ),
  card: (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="M3 10h18" />
      <path d="M7 15h4" />
    </svg>
  ),
  download: (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M4 19h16" />
    </svg>
  ),
  twitter: (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M20 7.8c.01.2.01.4.01.6 0 6.2-4.7 10.6-10.6 10.6-2.1 0-4-.6-5.6-1.6h.8c1.7 0 3.2-.6 4.4-1.6a3.8 3.8 0 0 1-3.6-2.6 3.7 3.7 0 0 0 1.7-.1 3.8 3.8 0 0 1-3-3.7c.5.3 1.1.5 1.7.5a3.8 3.8 0 0 1-1.2-5 10.7 10.7 0 0 0 7.8 4 3.8 3.8 0 0 1 6.5-3.4 7.4 7.4 0 0 0 2.4-.9 3.7 3.7 0 0 1-1.7 2.1 7.7 7.7 0 0 0 2.2-.6 8.2 8.2 0 0 1-1.9 2Z" />
    </svg>
  ),
  linkedin: (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M7 9H4v11h3Z" />
      <path d="M5.5 7.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" />
      <path d="M20 20v-6.1c0-3.1-1.7-4.6-4-4.6a3.5 3.5 0 0 0-3.2 1.8V9H10v11h2.8v-5.6c0-1.5.9-2.4 2.2-2.4s2.1.9 2.1 2.4V20Z" />
    </svg>
  ),
  moon: (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M21 14.5A8.5 8.5 0 1 1 9.5 3a7 7 0 0 0 11.5 11.5Z" />
    </svg>
  ),
  search: (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  ),
  chevron: (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="m6 9 6 6 6-6" />
    </svg>
  ),
};

const formatAmount = (amount: number) => {
  const absolute = Math.abs(amount).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return amount < 0 ? `-$${absolute}` : `$${absolute}`;
};

export default function TransactionsPage() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <section className={styles.controls}>
          <label className={styles.search}>
            <span className={styles.searchIcon}>{icons.search}</span>
            <input
              type="text"
              placeholder="Search transactions..."
              aria-label="Search transactions"
            />
          </label>
          <div className={styles.selectGroup}>
            <div className={styles.selectWrap}>
              <select defaultValue={filters.categories[0]}>
                {filters.categories.map((option) => (
                  <option value={option} key={option}>
                    {option}
                  </option>
                ))}
              </select>
              <span className={styles.selectIcon}>{icons.chevron}</span>
            </div>
            <div className={styles.selectWrap}>
              <select defaultValue={filters.accounts[0]}>
                {filters.accounts.map((option) => (
                  <option value={option} key={option}>
                    {option}
                  </option>
                ))}
              </select>
              <span className={styles.selectIcon}>{icons.chevron}</span>
            </div>
          </div>
        </section>

        <section className={styles.tableCard} aria-label="Transactions">
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">Description</th>
                <th scope="col">Category</th>
                <th scope="col">Amount</th>
                <th scope="col">Account</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((transaction) => (
                <tr key={`${transaction.date}-${transaction.description}`}>
                  <td className={styles.date}>{transaction.date}</td>
                  <td className={styles.description}>
                    {transaction.description}
                  </td>
                  <td>
                    <span className={styles.categoryChip}>
                      {transaction.category}
                    </span>
                  </td>
                  <td
                    className={
                      transaction.amount < 0
                        ? styles.amountNegative
                        : styles.amountPositive
                    }
                  >
                    {formatAmount(transaction.amount)}
                  </td>
                  <td className={styles.account}>{transaction.account}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </main>

      <footer className={styles.footer}>
        <p>(c) 2026 FinTrack. All rights reserved.</p>
      </footer>
    </div>
  );
}
