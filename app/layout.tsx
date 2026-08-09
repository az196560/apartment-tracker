import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://az196560.github.io/apartment-tracker/"),
  title: "Bay Area Apartment Radar｜湾区公寓库存",
  description:
    "每天追踪旧金山、半岛、南湾和东湾带空调、室内洗烘且无特殊资格限制的官方公寓，支持区域、城市和户型筛选。",
  icons: {
    icon: "https://az196560.github.io/apartment-tracker/favicon.svg",
    shortcut: "https://az196560.github.io/apartment-tracker/favicon.svg",
  },
  openGraph: {
    title: "Bay Area Apartment Radar｜湾区公寓库存",
    description: "每天聚合湾区四区带空调、室内洗烘的普通市场价公寓与实时库存。",
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
    description: "每天追踪湾区四区带空调、室内洗烘的普通市场价公寓。",
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
