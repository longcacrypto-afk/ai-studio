import type { ReactNode } from "react";

// Layout tối thiểu: giao diện chính là public/index.html (prototype v2), không dùng UI tự viết.
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
