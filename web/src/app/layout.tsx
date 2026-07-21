import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://staylens.example.com"),
  title: {
    default: "Staylens | Explore Luxury Nature Stays",
    template: "%s | Staylens",
  },
  description:
    "Curated architectural wonders settled in Earth's most breathtaking landscapes. High-end hospitality meets environmental serenity.",
  keywords: [
    "vacation rentals",
    "luxury stays",
    "nature retreats",
    "architectural homes",
    "travel",
  ],
  openGraph: {
    title: "Staylens — Find Sanctuary in the Wilderness",
    description:
      "Curated architectural wonders in Earth's most breathtaking landscapes.",
    siteName: "Staylens",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Staylens — Find Sanctuary in the Wilderness",
    description:
      "Curated architectural wonders in Earth's most breathtaking landscapes.",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#0f5238",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${jakarta.variable} h-full`}>
      <body className="min-h-full flex flex-col">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
