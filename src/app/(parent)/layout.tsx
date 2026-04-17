import { getUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getParentByAuthId } from "@/data/parents";

export default async function ParentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();

  if (!user) {
    redirect("/login");
  }

  // Verify the user is a parent
  const parent = await getParentByAuthId(user.id);

  if (!parent) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-[#f6f6fb]">
      {children}
    </div>
  );
}
