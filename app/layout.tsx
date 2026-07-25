import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://az196560.github.io/apartment-tracker/"),
  title: "Peninsula One｜半岛 1B1B 房源雷达",
  description:
    "每天追踪 Burlingame 到 Menlo Park 的品质公寓 1B1B 可租信息，地图查看并直达官方房源。",
  icons: {
    icon: "https://az196560.github.io/apartment-tracker/favicon.svg",
    shortcut: "https://az196560.github.io/apartment-tracker/favicon.svg",
  },
  openGraph: {
    title: "Peninsula One｜半岛 1B1B 房源雷达",
    description: "好公寓，都放进雷达。每天聚合半岛 101 沿线官方 1B1B 房源。",
    type: "website",
    locale: "zh_CN",
    images: [
      {
        url: "og.png",
        width: 1731,
        height: 909,
        alt: "Peninsula One apartment availability radar",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Peninsula One｜半岛 1B1B 房源雷达",
    description: "每天追踪半岛 101 沿线品质公寓和官方 1B1B 房源。",
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
