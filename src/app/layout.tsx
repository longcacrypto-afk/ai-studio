import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "AI Studio",
  description: "Đặt thiết kế, video AI và landing page — báo giá rõ, có người duyệt trước khi giao.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
