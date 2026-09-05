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
  title: "Langsning FC Fan Hub",
  description:
    "The home of Langsning FC — matches, players, stories, history and statistics.",
  openGraph: {
    title: "Langsning FC Fan Hub",
    description:
      "Follow Langsning FC matches, players, stories, history and statistics.",
    url: "https://langsningsc.vercel.app",
    siteName: "Langsning FC Fan Hub",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Langsning FC Fan Hub",
    description:
      "Follow Langsning FC matches, players, stories, history and statistics.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
