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

export const metadata = {
  title: "Shopee Link Converter – Chuyển đổi link Affiliate",
  description: "Chuyển đổi link sản phẩm Shopee thành link Affiliate nhanh chóng. Dán link, nhận hoa hồng.",
  keywords: "shopee, affiliate, link converter, hoa hồng, chuyển đổi link",
  openGraph: {
    title: "Shopee Link Converter – Chuyển đổi link Affiliate",
    description: "Chuyển đổi link sản phẩm Shopee thành link Affiliate nhanh chóng.",
    type: "website",
  },
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="vi"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
