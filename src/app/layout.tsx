import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-playfair",
});

// Using system Impact font (no custom font file needed)
const impactVar = "--font-impact";

export const metadata: Metadata = {
  title: "EUONGELION | Daily Bread for the Cluttered Hungry Soul",
  description: "Craft your personal daily devotional & walk closer to God",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${playfair.variable} antialiased text-black`}
        style={{ backgroundColor: '#FAF9F6' }}
      >
        {children}
      </body>
    </html>
  );
}
