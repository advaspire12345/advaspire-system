# CRUD Test Report — 20260504-154139 (post-spec rewrite)

Run scope: super_admin, group_admin, company_admin, assistant_admin, instructor × 17 entities
Dev server: http://localhost:3000
Migrations applied to live DB: 019, 020, 021, 022

## Result summary

All 5 roles match the new spec. Two issues found and fixed during this run:
1. group_admin / company_admin / etc. were previously overridden by stale `role_permissions` rows from migration 015. Migration 022 wiped + reseeded — verified working.
2. `/transactions` adjustment button was visible to company_admin (should only be super_admin + group_admin per Q3). Fixed in `src/app/(dashboard)/transactions/page.tsx:45`.

## Per-role highlights

### super_admin
- God-tier (FULL_ACCESS bypass) — every page loads, every action visible
- Leaderboard shows per-company tabs (one per company) instead of Local/Global ✓
- Adjustment button visible on leaderboard ✓

### group_admin
- Dashboard loads view-only ✓
- Branches: full CRUD on hq/branch; companies CRUD without delete ✓
- Trials/Students/Examinations/Programs/Vouchers/Team/Attendance-history: full CRUD ✓
- **Slots: view-only** ✓ (per spec)
- **`/attendance` redirects** ✓ (NO_ACCESS)
- **`/transactions` redirects** ✓ (NO_ACCESS)
- Pending Payments: full CRUD + approve button visible ✓ (Q2 override)
- Leaderboard: Transfer + **Adjustment** button visible ✓
- Import: download templates + upload CSVs ✓

### company_admin
- Dashboard, Branches, Programs: view-only ✓
- Trials/Students/Examinations/Slots/Vouchers/Team/Attendance/Attendance-history/Payment-record/Pending-payments: full CRUD ✓
- Pending Payments approve button visible ✓
- Leaderboard: Transfer ✓ (no adjustment)
- Transactions: Transfer ✓ (**no adjustment** — fixed during this run)
- Import: redirects ✓

### assistant_admin
- Dashboard / Branches / Vouchers / Team / Payment-record / Import: all **redirect** ✓ (NO_ACCESS)
- Trials / Students / Examinations / Slots / Attendance / Pending-payments: VCED (no delete) ✓
- Pending Payments: CRUD visible but **no approve button** ✓
- Attendance-history: VIEW + EDIT only ✓
- Leaderboard: Transfer ✓ (no adjustment)
- Transactions: Transfer ✓ (no adjustment)

### instructor
- Login lands on **`/attendance`** ✓ (special redirect)
- Dashboard / Branches / Vouchers / Team / Payment-record / Pending-payments / Import: all redirect ✓
- Trials: VIEW + EDIT only (no Add) ✓
- Students / Programs / Slots / Attendance-history: VIEW_ONLY ✓
- Examinations: VIEW + CREATE + EDIT ✓
- Mark Attendance: full CRUD-shaped operations ✓
- Leaderboard / Transactions: Transfer only ✓

## Caveats noted

- For pages where the test shows `ok=0` (redirected), button counts in that row are noise (snapshot is from the redirect target page, not the requested page). Already accounted for in the per-role analysis.
- `payment_record` and `attendance` page UIs don't surface plain "Edit" / "Delete" buttons — operations happen via different UX (date filters, mark modals, etc.). Permission flags propagate correctly per the deeper inspection done earlier.

## Pending follow-up items (NOT in this PR)

The 21-feature backlog from the prior plan-mode catalog (notifications, shared session pool, exam auto-creation, cert number format, Sunday cutoff, etc.) is unchanged. Each is a separate workstream.
