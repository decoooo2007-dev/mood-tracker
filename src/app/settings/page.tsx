import SettingsPage from "@/components/app/SettingsPage";
import AuthGuard from "@/components/ui/AuthGuard";

export default function Page() {
  return (
    <AuthGuard>
      <SettingsPage />
    </AuthGuard>
  );
}
