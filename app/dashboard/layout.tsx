import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { CreditsProvider } from "@/components/dashboard/CreditsContext";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <CreditsProvider>
      <DashboardShell>{children}</DashboardShell>
    </CreditsProvider>
  );
}
