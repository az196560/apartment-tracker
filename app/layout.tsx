import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://az196560.github.io/apartment-tracker/"),
  title: "Bay Area Apartment Radar｜湾区公寓库存",
  description:
    "每天追踪旧金山、半岛、南湾和东湾的官方公寓、户型与可租单元，支持区域、城市和户型筛选。",
  icons: {
    icon: "https://az196560.github.io/apartment-tracker/favicon.svg",
    shortcut: "https://az196560.github.io/apartment-tracker/favicon.svg",
  },
  openGraph: {
    title: "Bay Area Apartment Radar｜湾区公寓库存",
    description: "每天聚合 SF、半岛、南湾和东湾的官方公寓与实时户型库存。",
    type: "website",
    locale: "zh_CN",
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
    title: "Bay Area Apartment Radar｜湾区公寓库存",
    description: "每天追踪湾区四区的官方公寓、户型与可租单元。",
    images: ["og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
