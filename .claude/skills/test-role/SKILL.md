---
name: test-role
description: Interactive testing assistant for testing the LMS web app by user role. Guides through each page/feature, checks permissions, and tracks results.
---

# Role-Based Testing Assistant

When invoked, ask the user which role to test, then guide them through a structured testing checklist for that role. Track pass/fail results and report a summary at the end.

## Usage

Invoke with `/test-role` or `/test-role <role>` where role is one of:
- `super_admin`
- `group_admin`
- `company_admin`
- `assistant_admin`
- `instructor`
- `parent`
- `student`
- `public` (registration form)
- `login` (login features)

## Behavior

1. If no role argument provided, ask the user to pick one
2. Present the test checklist for that role, one section at a time
3. For each test item, ask the user to verify and report pass/fail
4. Track results and show a summary at the end
5. If a test fails, ask for details and log it

## Test Checklists by Role

### super_admin
God-tier role with FULL_ACCESS hardcoded — sees everything across all companies.

Pages to test:
- Dashboard: loads with stats, sees all branches across all companies
- Branches: full CRUD on Company/HQ/Branch.
  - Code field is required (cannot save with empty code)
  - Same code under different companies is allowed (e.g. company A and company B can each have branch "001")
  - Same code under the same company is rejected with a friendly error
  - Same area/city under same company is rejected (case-insensitive)
  - HQ/Branch rows show a "Copy Registration Link" icon → modal shows `/register/{COMPANY_CODE}/{BRANCH_CODE}` with a copy icon (NO embedded form)
- Students: view all, add/edit/delete, student ID format ADV-{code}-{YY}{seq}, parent dropdown
- Programs: view all, add (all tabs), pricing voucher dropdown, edit/delete
- Slot: view all grouped, add/edit/delete slots
- Voucher: view all, add (code auto-gen, uppercase, expiry type), edit/delete
- Team: view all, add (all roles), Edit Permissions button, role permission modal all tabs
- Examination: view all, add, certificate preview with template
- Mark Attendance: full CRUD (god-tier sees this page)
- Attendance History: view, date filter without refresh, full CRUD
- Payment Record: view all, full CRUD
- Pending Payments: full CRUD + approve button visible
- Leaderboard: **per-company tabs** (one tab per company in the system, NO Local/Global tabs); Transfer Adcoin button + Adjustment button both visible
- Transactions: view all globally, transfer + adjustment buttons
- Import: download templates + upload CSVs
- Profile: edit name/phone/address/city, change password

### group_admin
Oversight role over a single company. CRUD on most resources, with key restrictions.

Pages to test:
- Dashboard: VIEW_ONLY (sees own company data)
- Branches: full CRUD on HQ/branch under own company; **cannot delete company row** (delete button disabled/missing on company rows); can create/edit company
- Trials / Students / Examinations / Programs / Vouchers / Team / Attendance History: full CRUD scoped to own company
- Slot: VIEW_ONLY only — no Add/Edit/Delete
- Mark Attendance: page is NOT in sidebar; navigating to /attendance redirects away
- Payment Record: VIEW_ONLY + date search
- Pending Payments: full CRUD + **approve button visible** (per Q2 override)
- Leaderboard: own company only (no Local/Global tabs); Transfer Adcoin + **Adjustment button** both visible
- Transactions: page is NOT in sidebar; redirects away
- Import: download templates + upload CSVs

### company_admin
Operational role at one branch. CRUD on most things scoped to that branch.

Pages to test:
- Dashboard: VIEW_ONLY (sees own branch data)
- Branches: VIEW_ONLY
- Trials / Students / Examinations / Slot / Voucher / Team / Attendance / Attendance History / Payment Record / Pending Payments: full CRUD scoped to own branch
- Programs: VIEW_ONLY
- Pending Payments: **approve button visible**
- Leaderboard: Local/Global tabs (local = own branch, global = own company); Transfer button visible; **NO Adjustment button**
- Transactions: VIEW + Transfer Adcoin (no adjustment button)
- Import: NO_ACCESS — sidebar hidden, direct nav redirects
- Team: only Assistant + Instructor tabs in role permission modal

### assistant_admin
Junior admin at one branch. Operational without delete or oversight.

Pages to test:
- Dashboard: NO_ACCESS — sidebar hidden, redirects on direct nav
- Branches: NO_ACCESS
- Trials / Students / Examinations: VIEW + Create + Edit (no Delete button)
- Slot: VIEW + Create + Edit
- Vouchers: NO_ACCESS
- Team: NO_ACCESS
- Mark Attendance: VIEW + Create + Edit (no Delete)
- Attendance History: VIEW + Edit only
- Payment Record: NO_ACCESS
- Pending Payments: VIEW + Create + Edit; **NO approve button visible**
- Leaderboard: Local/Global tabs; Transfer button visible; no adjustment
- Transactions: VIEW + Transfer
- Import: NO_ACCESS

### instructor
Frontline role. Login redirects to `/attendance` (no dashboard access).

Pages to test:
- Dashboard: NO_ACCESS — login redirects to `/attendance` (not the default first viewable path)
- Branches: NO_ACCESS
- Trials: VIEW + Edit only (no create, no delete)
- Students: VIEW_ONLY
- Examinations: VIEW + Create + Edit
- Programs / Slot: VIEW_ONLY
- Vouchers / Team / Payment Record / Pending Payments: NO_ACCESS
- Mark Attendance: VIEW + Create + Edit
- Attendance History: VIEW_ONLY
- Leaderboard: Local/Global tabs; Transfer button visible; no adjustment
- Transactions: VIEW + Transfer
- Import: NO_ACCESS

### parent
Test the parent portal:
- Login with parent email → redirects to /parent
- Profile header: name, email, stats, settings icon → edit modal
- Edit modal: phone, address, postcode, city, password, cover+avatar upload
- Children section, upcoming classes, calendar, payment list, attendance list

### student
Test the student portal:
- Login via Student tab (username + password) → redirects to /student-portal
- View dashboard/progress, schedule, adcoin balance

### public
Test the registration form:
- Navigate to /register/{companyCode}/{branchCode} (the new two-segment URL)
- /register/{branchCode} (old single-segment URL) → 404
- Form loads with branch programs and slots
- Parent fields: name, email, phone, address, postcode, city
- Student fields: name, DOB(auto age), gender, school, program+slot (add multiple)
- Add Another Student button
- Submit creates pending student
- Desktop: two-column layout, mobile: single column

### login
- Remember Me: check → close browser → reopen → still logged in
- Remember Me: uncheck → close browser → reopen → logged out
- Forgot Password: click → email field → send reset link → check email
- Reset Password page: new password + confirm → update → login with new password

## Output Format

For each test section, present like:

```
## Testing: [Section Name]

1. [ ] Test description
   → What to check
   
2. [ ] Test description
   → What to check
```

After user reports results, update and move to next section. At the end:

```
## Test Summary — [Role]

✅ Passed: X
❌ Failed: Y
⏭ Skipped: Z

Failed tests:
- [Section] Test name: <user's notes>
```
