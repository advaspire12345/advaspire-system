import type { UserRole } from "@/db/schema";
import type { TourStep } from "@/components/help/tour-overlay";

// Step 1 across every role is the help button itself — that way the user
// learns where to relaunch the tour later.
const HELP_BUTTON_STEP: TourStep = {
  selector: '[data-tour="help-button"]',
  title: "This is your Help button",
  body:
    "Any time you forget what to do, click this question-mark icon and the tour starts again. We'll walk through the rest of the screen now.",
  placement: "bottom",
};

export const TOUR_STEPS: Record<UserRole, TourStep[]> = {
  super_admin: [
    HELP_BUTTON_STEP,
    {
      selector: 'a[href="/company"], a[href="/companies"]',
      title: "Step 1 — Create the company",
      body:
        "Start here. A company is the top-level org under which all branches live. You're the only role that can create one.",
    },
    {
      selector: 'a[href="/branches"]',
      title: "Step 2 — Add branches",
      body:
        "Each physical location is a branch. Add at least one so company_admins have somewhere to add students.",
    },
    {
      selector: 'a[href="/team"]',
      title: "Step 3 — Invite your team",
      body:
        "Create accounts: group_admin (if multi-branch), company_admin (per branch), instructor, assistant_admin. Assign instructors to programs from here.",
    },
    {
      selector: 'a[href="/courses"]',
      title: "Step 4 — Create programs and packages",
      body:
        "Each program is a course (e.g. 'Coding 101'). For every program also add at least one pricing package (e.g. 4-session at RM220) — that's what parents are billed.",
    },
    {
      selector: 'a[href="/slot"], a[href="/slots"]',
      title: "Step 5 — Set up weekly slots",
      body:
        "Each program needs slots: 'Coding 101, Monday 10:00, capacity 10'. Without slots, students get added but never appear on /attendance.",
    },
    {
      selector: 'a[href="/marketplace"]',
      title: "Step 6 — Approve adcoin top-ups",
      body:
        "Branches request adcoin top-ups here. You're the only role that can approve them — without your approval instructors run out of adcoin to award.",
      cantDo: [
        "Delegate top-up approval to group_admin or company_admin — only super_admin can approve.",
      ],
    },
  ],

  group_admin: [
    HELP_BUTTON_STEP,
    {
      selector: 'a[href="/branches"]',
      title: "Branches under your group",
      body:
        "Add any branches under your group that don't exist yet. Super_admin created the company; you fill in the branches.",
    },
    {
      selector: 'a[href="/courses"]',
      title: "Programs and packages",
      body:
        "Confirm every course your branches teach has at least one pricing package. Without it company_admin can't add students.",
    },
    {
      selector: 'a[href="/team"]',
      title: "Team members",
      body:
        "Invite company_admin, assistant_admin, and instructor accounts for each branch. Assign instructors to the programs they teach.",
    },
    {
      selector: 'a[href="/pending-payments"]',
      title: "Approve pending payments",
      body:
        "Every time a parent uploads a slip the row appears here. Approve it to credit sessions and activate the enrollment.",
    },
    {
      selector: 'a[href="/attendance-log"]',
      title: "Attendance log (read-only)",
      body:
        "Spot-check yesterday's attendance to confirm instructors are marking properly. You can view but not mark — that's the instructor's job.",
      cantDo: [
        "Mark live attendance (no /attendance page for group_admin).",
        "Approve adcoin top-ups (super_admin only).",
      ],
    },
  ],

  company_admin: [
    {
      selector: 'a[href="/student"], a[href="/students"]',
      title: "Start here — add your students",
      body:
        "Adding a student auto-creates their parent (if new), the enrollment, and the first pending payment. Siblings sharing: add the first as INDIVIDUAL, then add the second with 'Share with sibling' checked.",
    },
    HELP_BUTTON_STEP,
    {
      selector: 'a[href="/team"]',
      title: "Add your assistant admins and instructors",
      body:
        "Invite your branch team here: assistant_admin to help with day-to-day admin (trials, students, attendance), and instructor accounts for the people teaching the classes. Assign each instructor to the programs they teach so they only see what's theirs.",
    },
    {
      selector: 'a[href="/slot"], a[href="/slots"]',
      title: "Slots — required before students show up",
      body:
        "If a student doesn't appear on /attendance after you add them, it's almost always because no slot exists for the program at the right day/time. Create the slot first.",
    },
    {
      selector: 'a[href="/pending-payments"]',
      title: "Approve uploaded slips",
      body:
        "Once a parent uploads a payment slip, approve it here. That credits sessions and activates the enrollment — only then can the student be marked present.",
    },
    {
      selector: 'a[href="/attendance-log"]',
      title: "Audit yesterday's attendance",
      body:
        "Confirm your instructors marked every class. Edit any rows that look off.",
    },
    {
      selector: 'a[href="/marketplace"]',
      title: "Request adcoin top-ups",
      body:
        "When your branch's instructor adcoin pool runs low, request a top-up here. Super_admin will approve it.",
      cantDo: [
        "Create programs or branches (group_admin / super_admin only).",
        "Approve adcoin top-up requests (super_admin only).",
      ],
    },
  ],

  assistant_admin: [
    HELP_BUTTON_STEP,
    {
      selector: 'a[href="/trial"], a[href="/trials"]',
      title: "Add trial bookings",
      body:
        "Log walk-ins, phone enquiries, and online sign-ups here. Convert a successful trial into a real student in one click.",
    },
    {
      selector: 'a[href="/student"], a[href="/students"]',
      title: "Add students",
      body:
        "Adding a student creates the enrollment and pending payment. Your company_admin will need to approve the payment — you can see it but can't click Approve.",
    },
    {
      selector: 'a[href="/attendance"]',
      title: "Mark attendance for stand-ins",
      body:
        "If an instructor is unavailable you can mark attendance on their behalf from here.",
    },
    {
      selector: 'a[href="/slot"], a[href="/slots"]',
      title: "Adjust slots and capacity",
      body:
        "Bump slot capacity, add ad-hoc slots, or close one as enrolment shifts.",
      cantDo: [
        "Approve pending payments (company_admin or above only).",
        "Create programs, branches, vouchers, or team members.",
        "Access /marketplace or /import.",
      ],
    },
  ],

  instructor: [
    HELP_BUTTON_STEP,
    {
      selector: 'a[href="/attendance"]',
      title: "Mark attendance — your main daily action",
      body:
        "At the start of class, click 'Mark X as Present' for each student. Fill in lesson, mission, activity, and optionally award adcoin. If a student does an unscheduled extra session the same day, use the top 'Take Attendance' button and pick a different time.",
    },
    {
      selector: 'a[href="/leaderboard"]',
      title: "Leaderboard",
      body:
        "See how your students rank in the branch. Useful for motivation and end-of-term shout-outs.",
    },
    {
      selector: 'a[href="/transactions"]',
      title: "Track your adcoin awards",
      body:
        "Every adcoin you give a student is deducted from your own balance. Watch your balance here. If you run out, ask company_admin to request a top-up in /marketplace.",
      cantDo: [
        "Add or edit students (read-only view).",
        "Approve or even view pending payments.",
        "Award more adcoin than you currently hold.",
      ],
    },
  ],

  parent: [
    HELP_BUTTON_STEP,
    {
      selector: '[data-tour="parent-children"], main',
      title: "Your children's overview",
      body:
        "Each child shows their attendance summary, sessions remaining, and upcoming classes. Tap a child for more detail.",
      placement: "bottom",
    },
    {
      selector: '[data-tour="parent-payments"], a[href="/parent/payments"]',
      title: "Upload payment slips here",
      body:
        "When you have a pending payment, pay via bank transfer / Billplz / Atome and upload the slip. The branch will approve and credit sessions.",
    },
    {
      selector: '[data-tour="parent-calendar"], a[href="/parent/calendar"]',
      title: "Calendar & rescheduling",
      body:
        "See your child's upcoming classes. To reschedule a session, both the original and the new slot must be at least 24 hours away.",
      cantDo: [
        "See other parents' children.",
        "Approve your own payment (the branch must).",
        "Reschedule a session less than 24 hours away.",
      ],
    },
  ],

  student: [
    HELP_BUTTON_STEP,
    {
      selector: '[data-tour="student-coin"]',
      title: "Your adcoin balance",
      body:
        "Earn adcoin when instructors mark you present and award you. Spend it in the shop, send it to friends, or hold it to level up.",
      placement: "bottom",
    },
    {
      selector: '[data-tour="student-nav-ranking"]',
      title: "Ranking",
      body:
        "See where you stand against your classmates and the whole branch.",
      placement: "top",
    },
    {
      selector: '[data-tour="student-nav-missions"]',
      title: "Missions",
      body:
        "Each lesson has missions. Complete them to earn more adcoin and progress to the next level.",
      placement: "top",
    },
    {
      selector: '[data-tour="student-nav-shop"]',
      title: "Shop",
      body:
        "Spend your adcoin on items the branch offers. Stock changes often.",
      placement: "top",
    },
    {
      selector: '[data-tour="student-nav-portfolio"]',
      title: "Portfolio",
      body:
        "Upload photos of projects you build so your parent and instructor can see your work.",
      placement: "top",
      cantDo: [
        "Mark your own attendance.",
        "Add adcoin yourself — you only earn from instructor awards or receive transfers from friends.",
        "Transfer more adcoin than you have.",
      ],
    },
  ],
};
