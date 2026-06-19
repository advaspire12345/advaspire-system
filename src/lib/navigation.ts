import {
  LayoutDashboard,
  CalendarCheck,
  ClipboardList,
  CreditCard,
  Clock,
  Coins,
  Building2,
  Trophy,
  ArrowLeftRight,
  FlaskConical,
  FileUser,
  GraduationCap,
  LineChart,
  Users,
  Award,
  Ticket,
  Upload,
  CalendarDays,
  BarChart3,
} from "lucide-react";

import type { PermissionResource, UserRole } from "@/db/schema";

export interface NavItem {
  title: string;
  icon: typeof LayoutDashboard;
  href: string;
  resource: PermissionResource;
}

export const navigationItems: NavItem[] = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    href: "/dashboard",
    resource: "dashboard",
  },
  {
    title: "Summary",
    icon: BarChart3,
    href: "/summary",
    resource: "dashboard",
  },
  {
    title: "Branches",
    icon: Building2,
    href: "/branches",
    resource: "branches",
  },
  {
    title: "Trial",
    icon: FlaskConical,
    href: "/trial",
    resource: "trials",
  },
  {
    title: "Student",
    icon: FileUser,
    href: "/student",
    resource: "students",
  },
  {
    title: "Examination",
    icon: Award,
    href: "/examination",
    resource: "examinations",
  },
  {
    title: "Student Progress",
    icon: LineChart,
    href: "/student-progress",
    resource: "student_progress",
  },
  {
    title: "Courses",
    icon: GraduationCap,
    href: "/courses",
    resource: "programs",
  },
  {
    title: "Slot",
    icon: Clock,
    href: "/slot",
    resource: "slots",
  },
  {
    title: "Voucher",
    icon: Ticket,
    href: "/voucher",
    resource: "vouchers",
  },
  {
    title: "Team",
    icon: Users,
    href: "/team",
    resource: "team",
  },
  {
    title: "Mark Attendance",
    icon: CalendarCheck,
    href: "/attendance",
    resource: "attendance",
  },
  {
    title: "Attendance History",
    icon: ClipboardList,
    href: "/attendance-log",
    resource: "attendance_log",
  },
  {
    title: "Payment Record",
    icon: CreditCard,
    href: "/payment-record",
    resource: "payment_record",
  },
  {
    title: "Pending Payments",
    icon: Clock,
    href: "/pending-payments",
    resource: "pending_payments",
  },
  {
    title: "Leaderboard",
    icon: Trophy,
    href: "/leaderboard",
    resource: "leaderboard",
  },
  {
    title: "Transactions",
    icon: ArrowLeftRight,
    href: "/transactions",
    resource: "transactions",
  },
  {
    title: "Marketplace",
    icon: Coins,
    href: "/marketplace",
    resource: "marketplace",
  },
  {
    title: "Import",
    icon: Upload,
    href: "/import",
    resource: "import",
  },
  {
    title: "Events",
    icon: CalendarDays,
    href: "/events",
    resource: "events",
  },
];

/**
 * Returns the ordered list of featured permission resources for a given role.
 * Featured actions are surfaced prominently in the dashboard launcher and sidebar.
 */
export function getFeaturedResources(
  role: UserRole | null
): PermissionResource[] {
  if (role === "instructor") {
    return ["attendance", "attendance_log", "student_progress"];
  }
  // super_admin / group_admin / company_admin / assistant_admin (and any other)
  return [
    "students",
    "trials",
    "attendance",
    "attendance_log",
    "student_progress",
  ];
}
