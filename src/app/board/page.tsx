import BoardPage from "@/components/app/BoardPage";
import AuthGuard from "@/components/ui/AuthGuard";

export default function Page() {
  return (
    <AuthGuard>
      <BoardPage />
    </AuthGuard>
  );
}
