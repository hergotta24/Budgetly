import type { Metadata, Viewport } from "next";
import { AppDataProvider } from "@/components/AppDataProvider";
import { ThemeScript } from "@/components/ThemeScript";
import { AppShell } from "@/components/layout/AppShell";
import { ToastProvider } from "@/components/ui/Toast";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Budgetly — private, local-first budgeting",
    template: "%s · Budgetly",
  },
  description:
    "Turn bank and credit-card CSV exports into a monthly budget. Your financial data stays in your browser.",
  applicationName: "Budgetly",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f6f9" },
    { media: "(prefers-color-scheme: dark)", color: "#101015" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="antialiased">
        <AppDataProvider>
          <ToastProvider>
            <AppShell>{children}</AppShell>
          </ToastProvider>
        </AppDataProvider>
      </body>
    </html>
  );
}
