import Link from "next/link";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Research Outreach",
  description: "Dashboard for startup and lab outreach research."
};

const navItems = [
  { href: "/", label: "Overview" },
  { href: "/profiles", label: "Profiles" },
  { href: "/search-runs", label: "Search Runs" },
  { href: "/findings", label: "Findings" },
  { href: "/opportunities", label: "Opportunities" },
  { href: "/drafts", label: "Drafts" }
];

type RootLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body>
        <div className="app-frame">
          <header className="app-header">
            <Link className="brand" href="/">
              Research Outreach
            </Link>
            <nav className="app-nav" aria-label="Primary">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href}>
                  {item.label}
                </Link>
              ))}
            </nav>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
