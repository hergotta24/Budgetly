import type { Metadata } from "next";
import "./globals.css";
import Header from "./components/Header";
import Providers from "@/store/Providers";

export const metadata: Metadata = {
  title: "Budgetly",
  description: "A private, local-first financial workspace",
};  

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <Header />
          {children}
        </Providers>
      </body>
    </html>
  );
}

