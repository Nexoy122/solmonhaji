import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { AdminGate } from "@/components/admin/AdminGate";

export const metadata: Metadata = {
  // Give nothing away in the tab title before the role check resolves.
  title: "Not found",
  robots: { index: false, follow: false, nocache: true },
};

// Loaded only after AdminGate proves the role, so the admin bundle is never
// fetched for a non-admin visitor.
const AdminPanel = dynamic(() => import("@/components/admin/AdminPanel").then((m) => m.AdminPanel));

export default function AdminPage() {
  return (
    <AdminGate>
      <AdminPanel />
    </AdminGate>
  );
}
