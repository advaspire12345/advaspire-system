---
name: roles-and-permissions
description: All 7 user roles and exactly what each can do (full permission matrix)
metadata:
  type: reference
---

# Roles & Permissions — Advaspire LMS

**Total roles: 7** — defined in `src/db/schema.ts` (`UserRole`). Permissions for the
5 staff roles come from `src/data/permissions.ts` (DB table `role_permissions`, with
the hardcoded defaults below as fallback). `student` and `parent` are **not** in this
matrix — they have their own portals.

| # | Role | Type | Where it's governed |
|---|------|------|---------------------|
| 1 | `super_admin` | Staff (god-tier) | Always full access, **immutable** |
| 2 | `group_admin` | Staff | `role_permissions` → `GROUP_ADMIN_DEFAULTS` |
| 3 | `company_admin` | Staff | `role_permissions` → `COMPANY_ADMIN_DEFAULTS` |
| 4 | `assistant_admin` | Staff | `role_permissions` → `ASSISTANT_ADMIN_DEFAULTS` |
| 5 | `instructor` | Staff | `role_permissions` → `INSTRUCTOR_DEFAULTS` |
| 6 | `student` | Portal user | Student portal (no resource matrix) |
| 7 | `parent` | Portal user | Parent portal (no resource matrix) |

> Plus **custom roles** (max **2 per company**, table `custom_roles`) — configured
> through the same permission system, not a fixed 8th role.

## Legend
`V` = view · `C` = create · `E` = edit · `D` = delete · `—` = no access · **Full** = VCED

## Full permission matrix (staff roles)

Resources use their UI labels (`RESOURCE_LABELS`). 19 resources total.

| Resource (key) | super_admin | group_admin | company_admin | assistant_admin | instructor |
|---|---|---|---|---|---|
| Dashboard (`dashboard`) | Full | V | V | — | — |
| Companies (`companies`) | Full | V C E | V | — | — |
| Branches (`branches`) | Full | Full | V | — | — |
| Trial (`trials`) | Full | Full | Full | V C E | V E |
| Student (`students`) | Full | Full | Full | V C E | V |
| Examination (`examinations`) | Full | Full | Full | V C E | V C E |
| Program (`programs`) | Full | Full | V | V | V |
| Slot (`slots`) | Full | V | Full | V C E | V |
| Voucher (`vouchers`) | Full | Full | Full | — | — |
| Team (`team`) | Full | Full | Full | — | — |
| Mark Attendance (`attendance`) | Full | — | Full | V C E | V C E |
| Attendance History (`attendance_log`) | Full | Full | Full | V E | V |
| Payment Record (`payment_record`) | Full | V | Full | — | — |
| Pending Payments (`pending_payments`) | Full | Full | Full | V C E | — |
| Leaderboard (`leaderboard`) | Full | V C | V C | V C | V C |
| Transactions (`transactions`) | Full | — | V C | V C | V C |
| Marketplace (`marketplace`) | Full | V | V C | — | — |
| Import (`import`) | Full | V C | V C | — | — |
| Events (`events`) | Full | Full | Full | Full | V C E |

## What each role can do (plain English)

### 1. `super_admin` — god-tier
Full create/read/edit/delete on **every** resource. Access is hardcoded and
**cannot be changed** by the permission modal. Only role that:
- **Approves marketplace top-up requests** (every other role can at most view/request).
- Edits the **global default** permissions for `group_admin`.

### 2. `group_admin` — group/organization manager
Manages the whole group across companies. Notable scope:
- **Full**: branches, trials, students, examinations, programs, vouchers, team, attendance history, pending payments, events.
- **Companies**: can create/edit but **not delete** (`COMPANIES_NO_DELETE`).
- **View-only**: dashboard, slots, payment records, marketplace (sees the top-up table, no actions).
- **No access**: marking attendance, transactions.
- Leaderboard `V C` — the `create` flag is what enables the **Transfer Adcoin** button.

### 3. `company_admin` — single-company manager
Runs one company end-to-end. Notable scope:
- **Full**: trials, students, examinations, slots, vouchers, team, attendance + history, payment records, pending payments, events.
- **View-only**: companies, branches, programs.
- **Marketplace `V C`** — can browse and **create top-up requests** (but super_admin approves them).
- Can set **per-branch** permission overrides for `assistant_admin` / `instructor` under their company.

### 4. `assistant_admin` — front-desk / ops assistant
Day-to-day data entry, **no money and no people-management**:
- **View/Create/Edit** (no delete): trials, students, examinations, slots, attendance, pending payments.
- Attendance history `V E`; events **Full**.
- **No access**: dashboard, companies, branches, vouchers, team, payment records, marketplace, import.
- Has pending-payments `V C E` but **no Approve button** (approval is gated separately to admins).

### 5. `instructor` — teaching staff
Centered on attendance + exams for their own classes:
- **Mark Attendance `V C E`** (primary workflow — login redirects to `/attendance`).
- **Examination `V C E`**; events `V C E` (no delete).
- **View-only**: students, programs, slots, attendance history.
- **Trials `V E`** (can update, not create/delete).
- **No access**: dashboard, companies, branches, vouchers, team, payment records, pending payments, marketplace, import.

### 6. `student` — portal user
Uses the **student portal / `learn` area**, not the admin dashboard. No entry in the
resource matrix (sees own progress, sessions, leaderboard/adcoin, etc. via portal pages).

### 7. `parent` — portal user
Uses the **parent portal**, not the admin dashboard. No entry in the resource matrix
(sees their children, payments, can self-register, etc. via portal pages).

## Important nuances (don't miss these)
- **DB-driven, defaults are fallback.** Actual permissions are read from
  `role_permissions`; the tables above are the hardcoded fallback used when no DB rows
  exist. Resolution order: per-branch → company-wide → global default → hardcoded.
- **Per-branch overrides apply only to `assistant_admin` and `instructor`.** Everyone
  else resolves at the company tier.
- **Some buttons are gated beyond view/create/edit/delete:**
  - Pending Payments **Approve** → admins only (not assistant_admin, despite its `V C E`).
  - Marketplace top-up **Approve** → `super_admin` only.
  - Leaderboard **Transfer Adcoin** → gated by the leaderboard `can_create` flag.
  - Import: `view` = download templates, `create` = upload CSV.
- **Server-side enforcement:** `authorizeAction(resource, action)` throws `Forbidden`
  in server actions; do not rely on UI hiding alone.
- **Legacy role names** auto-normalize: `admin` → `group_admin`, `branch_admin` → `company_admin`.

See also [[roles-and-entities]] (entity list the CRUD tester walks) and
[[testing-harness]] (`test-crud` asserts live UI behavior against this matrix).
