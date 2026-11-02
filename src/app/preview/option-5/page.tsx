import Option5Glassmorphism from "@/components/previews/Option5Glassmorphism";
import { notFound } from "next/navigation";

export default function Option5Page() {
  if (process.env.NODE_ENV === "production") notFound();
  return <Option5Glassmorphism />;
}
