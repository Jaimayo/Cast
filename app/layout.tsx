import type { Metadata } from "next";
import { AuthNav } from "@/components/auth-nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cast — private character studio",
  description: "Invite-only private studio for fictional adult stills. No public gallery.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="wrap site-header">
          <a className="wordmark" href="/">
            Cast
          </a>
          <nav className="nav-links">
            <a href="/#how">How it works</a>
            <AuthNav />
          </nav>
        </div>
        {children}
      </body>
    </html>
  );
}
