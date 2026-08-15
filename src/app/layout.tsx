import type { Metadata } from "next";
import { Geist, Geist_Mono, Jost } from "next/font/google";
import "./globals.css";

// The display face - a geometric sans in the Futura lineage, which is
// what period broadcast graphics were actually set in. Used for
// headings, the projector's slides and anything that should feel like
// part of the show rather than part of the tool.
const jost = Jost({
  variable: "--font-jost",
  subsets: ["latin"],
});

// The working face. Deliberately plain and modern - it carries the
// dense host-facing screens (scoring tables, question lists) where
// character would just get in the way of reading numbers quickly.
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "QuizConstructor",
  description: "Build and run pub quiz nights.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${jost.variable} ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
