import Option1Serene from "@/components/previews/Option1Serene";
import { notFound } from "next/navigation";

export default function Option1Page() {
  if (process.env.NODE_ENV === "production") notFound();
  return <Option1Serene />;
}
