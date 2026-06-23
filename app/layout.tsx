import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sugimoto Visa — Consultation Studio",
  description:
    "Generate tailored post-consultation pathway presentations for clients.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
