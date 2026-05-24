# Onboarding by Role

A first-time setup checklist and a day-to-day routine for every role in the LMS. Use this when you've just been given an account and you're not sure what to do first.

> Permission source of truth is `src/data/permissions.ts`. If this doc and the matrix ever disagree, the matrix wins.

---

## Quick map — who owns what

| Role | Scope | Lands on | What they primarily own |
|---|---|---|---|
| **super_admin** | The whole system | `/dashboard` | Companies, branches, programs, system-wide settings, adcoin top-up approval |
| **group_admin** | One group (multi-branch) | `/dashboard` | Branches under their group, programs, team |
| **company_admin** | One company / branch | `/dashboard` | Students, payments approvals, attendance, day-to-day operations |
| **assistant_admin** | One branch (support role) | `/trials` (no dashboard) | Trials, students, attendance entry, slots |
| **instructor** | Their classes | `/attendance` | Marking attendance, adcoin awards, exams for their classes |
| **parent** | Their own children | `/parent` | Viewing children's progress, paying for renewals |
| **student** | Their own portal | `/portal` | Ranking, missions, shop, adcoin transfers |

---

## Bootstrap order — setting up an empty LMS

If the system is brand new (no data), this is the order to populate it. Each layer depends on the one above, so doing it out of order leaves you unable to finish the next step.

1. **Company** (super_admin) — the top-level org
2. **Branches** under that company (super_admin or group_admin)
3. **Team members** per branch — group_admin, company_admin, assistant_admin, instructor (super_admin or group_admin)
4. **Programs** (courses) — what's actually taught (super_admin or group_admin)
5. **Packages** (course pricing) per program — e.g. 4-session, 12-session, monthly (super_admin or group_admin)
6. **Slots** per program/branch — the weekly time slots students can be enrolled into (any admin)
7. *(Optional)* **Voucher templates** — discount codes or completion-bonus voucher templates (super_admin or group_admin)
8. **Parents** — added implicitly when their first child is enrolled (company_admin or assistant_admin)
9. **Students** — adding the student auto-links to a parent (or creates one) and creates the enrollment + first pending payment (company_admin or assistant_admin)
10. **First payment approval** — once the parent has uploaded a slip (or paid online) the payment can be approved, which credits sessions and activates the enrollment (super_admin, group_admin, or company_admin only)
11. **Mark attendance** — instructor's first action; sessions start ticking down (instructor or company_admin)

Once #1–#10 are done, parents and students can log into their portals and the day-to-day cycle begins.

---

## super_admin

The owner of the whole LMS. Hardcoded by email in `SUPERADMIN_EMAILS`.

### First-time setup

1. Log in → `/dashboard`.
2. Create the company you'll be running classes under (Companies tab).
3. Create at least one branch under it.
4. Open the Team page and create one of each: a group_admin (if you have multiple branches under a group), at least one company_admin per branch, an instructor, and an assistant_admin if you have ops staff.
5. Open Programs, create the courses you teach (e.g. "Coding 101"). For each program, define at least one **package** in `course_pricing` (e.g. 4-session at RM220) — that's what parents are billed.
6. Open Slots, define the weekly time slots per program/branch (e.g. "Coding 101, Monday 10:00, capacity 10").
7. *(Optional)* Create voucher templates in the Vouchers page if you want to offer completion-bonus vouchers (the template's `discount_value` becomes the amount students earn).

After this the LMS is ready for delegation — company_admin and assistant_admin can start adding students.

### Every day

- Approve adcoin top-up requests in `/marketplace` (only you can do this).
- Spot-check the dashboard stats across all branches.
- Adjust leaderboards if any disputes arise.
- Promote / demote / deactivate team members as needed.

### What you can't (shouldn't) do day-to-day

You technically can do anything, but the routine work — payment approvals, attendance, student adds — should be delegated to company_admin or assistant_admin. Reserve super_admin for governance.

---

## group_admin

Manages a set of branches grouped under one regional / brand entity.

### First-time setup

1. Log in → `/dashboard`.
2. Add any missing branches under your group.
3. Create team members for each branch (company_admin, assistant_admin, instructor).
4. Confirm Programs and Packages exist — add anything missing.
5. Confirm Slots exist for each program in each branch.

### Every day

- Approve **pending payments** for any branch under your group (`/pending-payments`).
- Watch attendance-log for any unmarked classes.
- Adjust leaderboards across branches if needed.
- Onboard new team members when branches grow.

### What you can't do

- Mark live attendance (no `/attendance` page access — use attendance-log for read-only view).
- Approve adcoin top-up requests (super_admin only).
- Adjust company-level top-up balances.

---

## company_admin

Runs a single branch / company day-to-day. This is the busiest admin role.

### First-time setup

1. Log in → `/dashboard`.
2. Open **Slots**, confirm your branch has at least one slot per program you teach (create if missing).
3. Open **Team**, confirm your instructor accounts exist and are assigned to the right programs.
4. Open **Students**, add your first batch:
   - For each student: name, parent details (auto-creates parent if email is new), program, package. The system creates the enrollment and the first pending payment automatically.
   - Siblings sharing a package: add the first as INDIVIDUAL, then add the second with "Share with sibling" checked.
5. Once the parent uploads a payment slip (or pays online), open **Pending Payments** and approve — that credits sessions and activates the enrollment.

### Every day

- Open `/pending-payments` and approve any new slips that came in overnight.
- Add new students as they enrol.
- Handle reschedule / cancellation / package upgrade edits.
- Spot-check `/attendance-log` to confirm instructors marked yesterday's classes.
- Issue vouchers if needed.
- Create top-up requests in `/marketplace` when your branch's adcoin pool runs low.

### What you can't do

- Create programs or branches (group_admin / super_admin only).
- Approve adcoin top-up requests (super_admin only).
- Read across companies you don't belong to.

---

## assistant_admin

Ops support — most of company_admin's work but no payment approval.

### First-time setup

1. Log in → you'll land on `/trials` (no dashboard).
2. Get familiar with: Trials, Students, Slots, Attendance, Examinations, Events.
3. Ask your company_admin who handles payment approvals — anything that needs an approval will land with them.

### Every day

- **Add trial bookings** as walk-ins / sign-ups come in (`/trials`).
- **Convert trials** to real students after a successful trial.
- **Add new students** (creates the pending payment too — but only company_admin or above can approve it).
- **Mark attendance** when an instructor is unavailable.
- **Adjust slots / class capacity** as enrolment shifts.
- **Add adcoin transactions** (manual awards / penalties).

### What you can't do

- Approve pending payments (you can see them but not click Approve).
- Create programs, branches, vouchers, team members.
- Access `/marketplace` or `/import`.

---

## instructor

Teaches classes and marks attendance.

### First-time setup

1. Log in → you land directly on `/attendance` — no dashboard.
2. Confirm your name appears as the assigned instructor on your classes (if not, ask company_admin to add you under Team → Course assignments).
3. Familiarise yourself with: the per-row "Mark X as Present / Absent" buttons, the page-level "Take Attendance" button (for extra/ad-hoc sessions on the same day), and the Adcoin field on the mark-present modal.

### Every day

- Open `/attendance` at the start of class.
- Click "Mark Ali as Present" for each student who attended. Fill the lesson, mission, activity, and optionally award adcoin in the same modal.
- If a student joins for an unscheduled extra session on the same day, use the top "Take Attendance" button and pick a different time — same day + same time is blocked (duplicate prevention), same day + different time is allowed.
- If a student is doing an exam, mark them under `/examinations` and they will be recognised as having completed an exam attempt.
- Review your `/leaderboard` and `/transactions` view to track adcoin you've awarded.

### What you can't do

- Add / edit students (read-only view).
- Approve or even view pending payments.
- Create vouchers or run reports.
- Award adcoin from outside your own balance — the amount you give the student is **deducted from your instructor adcoin balance** and added to the student's. You can't give more than you have. Ask company_admin to top up your instructor adcoin (or approve a marketplace request).

---

## parent

Uses the parent portal at `/parent`. Sees their own children, nothing else.

### First-time setup

1. Receive login credentials from the branch (company_admin or assistant_admin sends them when your child is added).
2. Log in → `/parent` lands on a "My Children" overview.
3. Verify your contact details under Profile (name, email, phone, address).
4. Note the **Pending Payment** for the new enrolment — pay via bank transfer / Billplz / Atome and upload the slip via the payment list. The slip's `paid_at` is your timestamp; the system waits for company_admin to approve before crediting sessions.

### Every day / week

- Check **Upcoming Classes** for the week.
- After each class, check the **Attendance History** to see lesson/mission/activity recorded by the instructor.
- Watch sessions remaining: when it hits 0 the system auto-creates a renewal pending payment — pay it the same way as the first one.
- Browse the **Project Gallery** to see what your child built.
- **Reschedule** a session if needed: must be ≥24 hours in advance, both for the cancelled slot and the new slot. Pick a non-full slot in the same course; the cancelled slot shows in grey on the calendar, the new slot shows scheduled-colour.

### What you can't do

- See other parents' children.
- Approve your own payment (an admin must).
- Edit a session after it's been marked attended.

---

## student

Uses the student portal — adcoin economy, mission tracking, shop, leaderboard.

### First-time setup

1. Get login credentials from your parent or the branch.
2. Log in → `/portal` lands on Home, showing your adcoin balance, current mission, and ranking.
3. Have a poke around: Ranking, Transfer, Portfolio, Events, Shop, Missions tabs.

### Every day

- Show up to class. The instructor awards adcoin when you're marked present and credits lesson/mission progress.
- Check **Missions** to see what's next.
- Check **Ranking** to see where you stand against your branch / classmates.
- **Transfer** adcoin to friends if you want.
- **Shop**: spend your adcoin on items the branch offers.
- **Portfolio**: upload project photos for projects you build.

### What you can't do

- See others' private data.
- Mark your own attendance.
- Add adcoin (you only earn from instructor awards).
- Transfer more adcoin than you have.

---

## Cheat sheet — who approves what

| Action | super_admin | group_admin | company_admin | assistant_admin | instructor |
|---|---|---|---|---|---|
| Create company | ✅ | — | — | — | — |
| Create branch | ✅ | ✅ | — | — | — |
| Create program | ✅ | ✅ | — | — | — |
| Create slot | ✅ | view | ✅ | ✅ | — |
| Create voucher template | ✅ | ✅ | ✅ | — | — |
| Add student | ✅ | ✅ | ✅ | ✅ | — |
| Approve payment | ✅ | ✅ | ✅ | — | — |
| Mark attendance | ✅ | — | ✅ | ✅ | ✅ |
| Award adcoin | ✅ | ✅ | ✅ | ✅ | ✅ |
| Approve adcoin top-up | ✅ | — | — | — | — |

---

## Common mistakes that bite first-timers

- **Adding a student before creating the slot.** The student gets added but doesn't appear on `/attendance` until a slot exists with matching day/time. Fix: create the slot, then the student row populates.
- **Approving a payment before the parent uploads the slip.** The Approve button stays disabled until `paid_at` and `receipt_photo` are both set. Either wait for the parent or use admin "edit" to stamp them manually.
- **Marking the same student twice on the same day at the same time.** Blocked by duplicate prevention. Use the page-level "Take Attendance" button and pick a different time for the extra session.
- **Wondering why sessions stayed at 0 after a renewal approval.** Check `enrollment.status` — if it was `expired`, the approval now also flips status back to `active` (as of the 2026-05-17 fix). Older flows may have left it stuck.
- **Trying to share siblings retroactively.** The "Shared" button only appears on the edit modal when both siblings have the same parent and same course. Verify enrolment / parent linkage first.
