import { redirect } from "next/navigation";

export default function LoginPage() {
  // Redirect to home - no login needed anymore
  redirect("/");
}
