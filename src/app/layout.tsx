import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "AI Real Estate Lead CRM",
    template: "%s | AI Real Estate Lead CRM",
  },
  description:
    "An AI-assisted CRM for real estate agents that captures leads, qualifies them, and drafts follow-ups for human review.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
