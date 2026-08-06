import { createContext, useContext, useEffect, useState, type PropsWithChildren } from "react";
import { useAuth } from "@/contexts/auth";
import { supabase } from "@/lib/supabase";

// Which portal this signed-in account belongs to. A single app: staff accounts
// (in `users`) land on the teacher portal; everyone else with a `parents` row on
// the parent portal. Detected once per session.

export type Portal = "parent" | "teacher" | "none";
export type StaffInfo = { id: string; name: string; role: string; branchId: string | null; photo: string | null };

type RoleState = { portal: Portal; loadingRole: boolean; staff: StaffInfo | null };
const Ctx = createContext<RoleState>({ portal: "none", loadingRole: true, staff: null });

export function RoleProvider({ children }: PropsWithChildren) {
  const { session } = useAuth();
  const userId = session?.user?.id;
  const [portal, setPortal] = useState<Portal>("none");
  const [staff, setStaff] = useState<StaffInfo | null>(null);
  const [loadingRole, setLoadingRole] = useState(true);

  useEffect(() => {
    if (!userId) { setPortal("none"); setStaff(null); setLoadingRole(false); return; }
    let active = true;
    setLoadingRole(true);
    (async () => {
      // NOTE: `users` has a role column that INCLUDES 'parent' — every parent also
      // has a users row with role='parent'. So a STAFF account is one whose
      // users.role is a real staff role (anything other than 'parent').
      const { data: u } = await supabase
        .from("users").select("id, name, role, branch_id, photo, deleted_at")
        .eq("auth_id", userId).is("deleted_at", null).maybeSingle();
      if (!active) return;
      const role = (u?.role as string | undefined) ?? "";
      const isStaff = !!u && role !== "" && role !== "parent";
      if (isStaff) {
        setStaff({ id: u!.id as string, name: (u!.name as string) ?? "", role, branchId: (u!.branch_id as string | null) ?? null, photo: (u!.photo as string | null) ?? null });
        setPortal("teacher");
        setLoadingRole(false);
        return;
      }
      const { data: p } = await supabase
        .from("parents").select("id").eq("auth_id", userId).is("deleted_at", null).maybeSingle();
      if (!active) return;
      setStaff(null);
      setPortal(p ? "parent" : "none");
      setLoadingRole(false);
    })();
    return () => { active = false; };
  }, [userId]);

  return <Ctx.Provider value={{ portal, loadingRole, staff }}>{children}</Ctx.Provider>;
}

export function useRole() {
  return useContext(Ctx);
}
