import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cast — private character studio",
  description: "Invite-only private studio for fictional adult stills. No public gallery.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
