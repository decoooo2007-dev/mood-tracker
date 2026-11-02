import Option2ZenGarden from "@/components/previews/Option2ZenGarden";
import { notFound } from "next/navigation";

export default function Option2Page() {
  if (process.env.NODE_ENV === "production") notFound();
  return <Option2ZenGarden />;
}
