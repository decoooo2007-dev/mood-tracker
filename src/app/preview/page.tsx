import { notFound, redirect } from "next/navigation";

export default function PreviewIndexPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }
  redirect("/preview/hub");
}
