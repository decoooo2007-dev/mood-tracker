import TodayPage from "@/components/app/TodayPage";
import AuthGuard from "@/components/ui/AuthGuard";

export default function Page() {
  return (
    <AuthGuard>
      <TodayPage />
    </AuthGuard>
  );
}
