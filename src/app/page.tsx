import { redirect } from "next/navigation";

// Trang chủ dùng prototype v2 đã duyệt (public/index.html), không dựng UI mới.
export default function Home() {
  redirect("/index.html");
}
