import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "NoteVault - Quản lý Chi tiêu Doanh nghiệp",
  description: "Hệ thống quản lý chi tiêu và đối soát hóa đơn tự động",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
