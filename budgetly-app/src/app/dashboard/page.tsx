import styles from "./page.module.css";

const navItems = [
  { label: "Import", icon: "upload", active: false },
  { label: "Transactions", icon: "list", active: false },
  { label: "Budget", icon: "wallet", active: false },
  { label: "Dashboard", icon: "grid", active: true },
  { label: "Spending", icon: "card", active: false },
  { label: "Export", icon: "download", active: false },
];

const topIcons = ["twitter", "linkedin", "moon"];

const monthlySpending = [550, 590, 700, 670, 820, 780];

const accounts = [
  { name: "Checking Account", balance: 2450.75 },
  { name: "Savings Account", balance: 12345.67 },
  { name: "Credit Card (Primary)", balance: -890.5 },
];

const recentTransactions = [
  { date: "Oct 26, 2023", name: "Groceries at Whole Foods", amount: -85.23 },
  { date: "Oct 25, 2023", name: "Monthly Salary", amount: 3500 },
  { date: "Oct 24, 2023", name: "Online Subscription", amount: -12.99 },
  { date: "Oct 23, 2023", name: "Dinner with Friends", amount: -65.5 },
  { date: "Oct 22, 2023", name: "Freelance Payment", amount: 500 },
];

const budgetBreakdown = [
  { label: "Food & Dining", value: 68 },
  { label: "Transportation", value: 38 },
  { label: "Housing", value: 100 },
  { label: "Shopping", value: 32 },
  { label: "Entertainment", value: 20 },
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
  bank: (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M3 9h18" />
      <path d="M5 9v8" />
      <path d="M9 9v8" />
      <path d="M15 9v8" />
      <path d="M19 9v8" />
      <path d="M4 17h16" />
      <path d="M12 4 3 8h18l-9-4Z" />
    </svg>
  ),
  cardSmall: (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="M3 10h18" />
      <path d="M7 15h4" />
    </svg>
  ),
  arrowUp: (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M7 17 17 7" />
      <path d="M9 7h8v8" />
    </svg>
  ),
  arrowDown: (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M7 7 17 17" />
      <path d="M15 17H7V9" />
    </svg>
  ),
};

const formatCurrency = (value: number) => {
  const absolute = Math.abs(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return value < 0 ? `-$${absolute}` : `$${absolute}`;
};

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];

export default function DashboardPage() {
  const maxValue = Math.max(...monthlySpending);
  const avgSpending =
    monthlySpending.reduce((total, value) => total + value, 0) /
    monthlySpending.length;

  const points = monthlySpending
    .map((value, index) => {
      const x = (index / (monthlySpending.length - 1)) * 100;
      const y = 100 - (value / maxValue) * 80 - 10;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className={styles.page}>

      <main className={styles.main}>
        <section className={styles.titleRow}>
          <h1>Dashboard Overview</h1>
        </section>

        <section className={styles.grid}>
          <article className={styles.card}>
            <div className={styles.cardHeader}>
              <div>
                <h2>Total Spending This Month</h2>
                <p>Overview of your spending habits.</p>
              </div>
              <div className={styles.avgSpending}>
                <span>Avg Spending</span>
                <strong>${avgSpending.toFixed(2)}</strong>
              </div>
            </div>
            <div className={styles.chartWrap}>
              <svg
                viewBox="0 0 100 60"
                role="img"
                aria-label="Spending trend"
              >
                <polyline
                  className={styles.chartLine}
                  points={points}
                  fill="none"
                />
                <line
                  className={styles.chartLineSecondary}
                  x1="0"
                  y1="24"
                  x2="100"
                  y2="24"
                />
              </svg>
              <div className={styles.chartAxis}>
                {months.map((month) => (
                  <span key={month}>{month}</span>
                ))}
              </div>
            </div>
            <div className={styles.legend}>
              <span>
                <i className={styles.legendDot} />
                Spending
              </span>
              <span>
                <i className={`${styles.legendDot} ${styles.legendMuted}`} />
                Budget
              </span>
            </div>
            <div className={styles.cardFooter}>
              <span>
                Current Spending: <strong>$790.00</strong>
              </span>
              <button className={styles.linkButton} type="button">
                View Details
              </button>
            </div>
          </article>

          <article className={styles.card}>
            <div className={styles.cardHeader}>
              <h2>Accounts</h2>
            </div>
            <ul className={styles.accountList}>
              {accounts.map((account) => (
                <li key={account.name} className={styles.accountRow}>
                  <span className={styles.accountIcon}>
                    {account.name.includes("Credit") ? icons.cardSmall : icons.bank}
                  </span>
                  <span className={styles.accountName}>{account.name}</span>
                  <span
                    className={
                      account.balance < 0
                        ? styles.amountNegative
                        : styles.amountPositive
                    }
                  >
                    {formatCurrency(account.balance)}
                  </span>
                </li>
              ))}
            </ul>
          </article>

          <article className={styles.card}>
            <div className={styles.cardHeader}>
              <h2>Recent Transactions</h2>
            </div>
            <ul className={styles.transactionList}>
              {recentTransactions.map((item) => (
                <li key={`${item.date}-${item.name}`} className={styles.transactionRow}>
                  <div>
                    <span className={styles.transactionDate}>{item.date}</span>
                    <p className={styles.transactionName}>{item.name}</p>
                  </div>
                  <span
                    className={
                      item.amount < 0
                        ? styles.amountNegative
                        : styles.amountPositive
                    }
                  >
                    <span className={styles.amountIcon}>
                      {item.amount < 0 ? icons.arrowDown : icons.arrowUp}
                    </span>
                    {formatCurrency(item.amount)}
                  </span>
                </li>
              ))}
            </ul>
          </article>

          <article className={styles.card}>
            <div className={styles.cardHeader}>
              <h2>Budget Breakdown</h2>
            </div>
            <div className={styles.breakdown}>
              {budgetBreakdown.map((item) => (
                <div key={item.label} className={styles.breakdownRow}>
                  <span>{item.label}</span>
                  <div className={styles.barTrack}>
                    <div
                      className={styles.barFill}
                      style={{ width: `${item.value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </article>
        </section>
      </main>

      <footer className={styles.footer}>
        <p>(c) 2026 FinTrack. All rights reserved.</p>
      </footer>
    </div>
  );
}
