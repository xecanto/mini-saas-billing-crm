import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Billing CRM",
  description: "Client subscriptions, invoicing, and payment tracking.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // Browser extensions (and theme scripts) stamp attributes onto <html>
    // and <body> before React hydrates, which React reports as a hydration
    // mismatch. suppressHydrationWarning only covers the element it's on,
    // not descendants, so both tags need it.
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
