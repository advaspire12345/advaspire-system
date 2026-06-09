import { redirect } from "next/navigation";
import { getCurrentUserPermissions, getFirstViewablePath } from "@/data/permissions";
import { Banner } from "@/components/ui/banner";
import {
  listAllSessionTransfers,
  getTransferableStudents,
} from "@/data/session-transfers";
import { TransfersClient } from "@/components/transfers/transfers-client";

export default async function SessionTransfersPage() {
  const permData = await getCurrentUserPermissions();
  if (!permData) redirect("/login");
  const isAdmin = ["super_admin", "group_admin", "company_admin", "assistant_admin"].includes(permData.role);
  if (!isAdmin) redirect(getFirstViewablePath(permData.permissions, permData.role));

  const [rows, students] = await Promise.all([
    listAllSessionTransfers(),
    getTransferableStudents(),
  ]);

  return (
    <main className="flex-1 overflow-auto px-6 py-12 bg-[#f6f6fb]">
      <div className="space-y-2">
        <Banner
          backgroundImage="/banners/dashboard-bg.png"
          title="Session Transfers"
          description="Move sessions between students across families"
          mascotImage="/banners/mascot.png"
        />
        <TransfersClient initialRows={rows} students={students} />
      </div>
    </main>
  );
}
