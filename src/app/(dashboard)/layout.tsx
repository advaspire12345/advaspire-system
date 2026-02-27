import { getUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { TopMenuBar } from "@/components/dashboard/top-menu-bar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-svh w-full flex-col">
        <TopMenuBar />
        <div className="flex flex-1 pt-14">
          <AppSidebar />
          <SidebarInset className="overflow-x-hidden">{children}</SidebarInset>
        </div>
      </div>
    </SidebarProvider>
  );
}
