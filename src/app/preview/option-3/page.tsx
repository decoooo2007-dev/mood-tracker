import Option3BentoGrid from "@/components/previews/Option3BentoGrid";
import { notFound } from "next/navigation";

export default function Option3Page() {
  if (process.env.NODE_ENV === "production") notFound();
  return <Option3BentoGrid />;
}
