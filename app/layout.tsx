import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://az196560.github.io/apartment-tracker/"),
  title: "Bay Area Apartment Radar | Official Bay Area Apartments",
  description:
    "Daily official inventory for professionally managed Bay Area apartments with in-unit laundry, including optional clearly labeled communities where air conditioning is not yet verified.",
  icons: {
    icon: "https://az196560.github.io/apartment-tracker/favicon.svg",
    shortcut: "https://az196560.github.io/apartment-tracker/favicon.svg",
  },
  openGraph: {
    title: "Bay Area Apartment Radar | Official Bay Area Apartments",
    description:
      "Explore unrestricted market-rate apartments with in-unit laundry across four Bay Area regions, with verified and clearly labeled AC-unverified options.",
    type: "website",
    locale: "en_US",
    alternateLocale: ["zh_CN"],
    images: [
      {
        url: "og.png",
        width: 1731,
        height: 909,
        alt: "Bay Area Apartment Radar",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Bay Area Apartment Radar | Official Bay Area Apartments",
    description:
      "Daily official apartment inventory across San Francisco, the Peninsula, South Bay, and East Bay.",
    images: ["og.png"],
  },
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
