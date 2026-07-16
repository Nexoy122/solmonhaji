import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { CreditsProvider } from "@/components/dashboard/CreditsContext";
import { OnboardingGate } from "@/components/onboarding/OnboardingGate";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <OnboardingGate>
      <CreditsProvider>
        <DashboardShell>{children}</DashboardShell>
      </CreditsProvider>
    </OnboardingGate>
  );
}
