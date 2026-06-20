import HistoryPage from "@/components/app/HistoryPage";
import AuthGuard from "@/components/ui/AuthGuard";

export default function Page() {
  return (
    <AuthGuard>
      <HistoryPage />
    </AuthGuard>
  );
}
