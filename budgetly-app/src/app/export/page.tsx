import styles from "./page.module.css";

const navItems = [
  { label: "Import", icon: "upload", active: false },
  { label: "Transactions", icon: "list", active: false },
  { label: "Budget", icon: "wallet", active: false },
  { label: "Dashboard", icon: "grid", active: false },
  { label: "Spending", icon: "card", active: false },
  { label: "Export", icon: "download", active: true },
];

const topIcons = ["twitter", "linkedin", "moon"];

const exportOptions = [
  {
    title: "Google Sheets",
    description:
      "Export your categorized transactions and reports directly to Google Sheets for collaborative analysis.",
    action: "Export to Google Sheets",
  },
  {
    title: "Microsoft Excel",
    description:
      "Download your financial data as an Excel spreadsheet for offline analysis and reporting.",
    action: "Export to Excel",
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
  sheet: (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9Z" />
      <path d="M14 3v6h6" />
      <rect x="8" y="12" width="8" height="2" rx="1" />
      <rect x="8" y="16" width="8" height="2" rx="1" />
    </svg>
  ),
};

export default function ExportPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.topBar}>
          <div className={styles.brand}>
            <span className={styles.logoMark}>
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <rect x="2" y="2" width="20" height="20" rx="6" />
                <path d="M7 15l3-3 3 2 4-5" />
                <path d="M7 7v8h8" />
              </svg>
            </span>
            <span className={styles.brandName}>Budgetly</span>
          </div>
          <div className={styles.topIcons}>
            {topIcons.map((icon) => (
              <button
                className={styles.iconButton}
                type="button"
                key={icon}
                aria-label={icon}
              >
                {icons[icon]}
              </button>
            ))}
          </div>
        </div>
        <nav className={styles.navTabs} aria-label="Primary">
          {navItems.map((item) => (
            <button
              type="button"
              key={item.label}
              className={`${styles.navButton} ${
                item.active ? styles.navActive : ""
              }`}
            >
              <span className={styles.navIcon}>{icons[item.icon]}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </header>

      <main className={styles.main}>
        <section className={styles.hero}>
          <h1>Export Your Financial Data</h1>
          <p>
            Choose your preferred application to seamlessly export your
            transaction history and financial reports. Your data will be
            securely transferred to the selected service.
          </p>
        </section>

        <section className={styles.cardGrid}>
          {exportOptions.map((option) => (
            <article className={styles.card} key={option.title}>
              <div className={styles.cardIcon}>{icons.sheet}</div>
              <h2>{option.title}</h2>
              <p>{option.description}</p>
              <button className={styles.ctaButton} type="button">
                {option.action}
              </button>
            </article>
          ))}
        </section>
      </main>

      <footer className={styles.footer}>
        <p>(c) 2026 FinTrack. All rights reserved.</p>
      </footer>
    </div>
  );
}
