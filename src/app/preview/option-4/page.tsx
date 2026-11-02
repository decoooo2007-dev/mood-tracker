import Option4Playful from "@/components/previews/Option4Playful";
import { notFound } from "next/navigation";

export default function Option4Page() {
  if (process.env.NODE_ENV === "production") notFound();
  return <Option4Playful />;
}
