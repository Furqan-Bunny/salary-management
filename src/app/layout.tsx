import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NavLink } from "@/components/NavLink";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ACME Salary Management",
  description: "Manage employee salaries and see how the organisation pays people.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans`}>
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-6xl items-center gap-8 px-6 py-4">
            <span className="font-semibold">ACME Salaries</span>
            <nav className="flex gap-1 text-sm">
              <NavLink href="/">Employees</NavLink>
              <NavLink href="/insights">Insights</NavLink>
              <NavLink href="/bands">Pay bands</NavLink>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
