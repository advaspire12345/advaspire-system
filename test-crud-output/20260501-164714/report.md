# CRUD Test Report — 20260501-164714

Run scope: super_admin × all entities (17)
Dev server: http://localhost:3000
Vault: lms-super_admin
Spec source: src/data/permissions.ts (SUPER_ADMIN_DEFAULTS)

## Result summary

Total cells observed: 17 entities × verifiable ops
- OK: 16/17
- Permission bug: 0
- Regression FIXED during run: 1 (leaderboard transfer-button gate)
- Spec gap (feature, not regression): 1 (no Adjustment button on leaderboard)

## Matrix (super_admin only)

Legend: V/C/E/D — ✅ matches expected-allow, ❌ matches expected-block, — = not applicable for entity, **FIX** = found wrong + fixed during run

| Entity | Expected | V | C | E | D | Notes |
|--------|:--------:|:-:|:-:|:-:|:-:|-------|
| dashboard | 1000 | ✅ | — | — | — | Loads, view-only |
| companies | 1111 | ✅ | ✅ | ✅ | ✅ | Add button visible on /branches; row Edit/Delete present for company rows |
| branches | 1111 | ✅ | ✅ | ✅ | ✅ | Add visible; 4 Registration-link icons on hq/branch rows; modal shows `http://localhost:3000/register/ADV/001` (correct format); duplicate-code rejection enforced server-side in addBranchAction |
| trials | 1000 | ✅ | ❌ | ❌ | ❌ | Page loads; no Add/Edit/Delete buttons present |
| students | 1000 | ✅ | ❌ | ❌ | ❌ | Page loads; no action buttons |
| examinations | 1000 | ✅ | ❌ | ❌ | ❌ | Page loads; no action buttons |
| programs | 1000 | ✅ | ❌ | ❌ | ❌ | Page loads; no action buttons |
| slots | 1000 | ✅ | ❌ | ❌ | ❌ | Page loads (now gated on `slots` permission, not `programs`); no action buttons |
| vouchers | 1000 | ✅ | ❌ | ❌ | ❌ | Page loads (now gated on `vouchers`); no action buttons |
| team | 1111 | ✅ | ✅ | ✅ | ✅ | Add visible; 10 Edit + 10 Delete buttons on rows |
| attendance | 0000 | ❌→/dashboard | — | — | — | Direct nav redirects to /dashboard; sidebar link absent |
| attendance_log | 1000 | ✅ | — | ❌ | — | Page loads; no Edit affordance shown |
| payment_record | 1000 | ✅ | — | ❌ | — | Page loads; no Edit affordance |
| pending_payments | 0000 | ❌→/dashboard | — | — | — | Direct nav redirects; sidebar link absent |
| leaderboard | 1100 | ✅ | ✅ **FIX** | — | — | Transfer Adcoin button now appears (was gated on transactions.can_create — fixed to use leaderboard.can_create) |
| transactions | 0000 | ❌→/dashboard | — | — | — | Direct nav redirects; sidebar link absent |
| import | 1100 | ✅ | ✅ | — | — | Page loads; Download Templates visible (4 categories) + 4 "Click to upload CSV" widgets shown (gated on `import.can_create`) |

## Sidebar visibility (super_admin)

Visible (correct): Dashboard, Branches, Trial, Student, Examination, Program, Slot, Voucher, Team, Attendance History, Payment Record, Leaderboard, Import
Hidden (correct): Mark Attendance, Pending Payments, Transactions

## Public registration route

| URL | Result |
|-----|--------|
| `/register/ADV/001` (new format) | ✅ Renders Student Registration form |
| `/register/ADV` (old single-segment) | ✅ 404 (route removed) |
| `/register/ADV/HQ` (no such branch) | ✅ "Invalid Registration Link" |

## Findings & fixes

### FIX-1: Leaderboard Transfer button was hidden for super_admin

- **Symptom**: First leaderboard scan showed 0 Transfer / Adjustment buttons even though spec says super_admin can transfer.
- **Root cause**: `src/app/(dashboard)/leaderboard/page.tsx:44` was passing `canTransfer={permData?.permissions.transactions?.can_create}`. Under the new spec, super_admin has `transactions = NO_ACCESS`, so the prop was false and the button hidden.
- **Fix applied**: Changed to `canTransfer={perms?.can_create}` where `perms = permData?.permissions.leaderboard`. Re-tested: 1 main "Transfer Adcoin" button + 10 row-level "Transfer adcoin to {name}" buttons now visible.
- **API gate**: `/api/adcoin/transfer/route.ts` only checks login (no per-resource permission gate), so the action layer accepts the call once the button is exposed.

### Spec gap: Adjustment button not on leaderboard

The spec line "[leaderboard] can read, can transfer adcoin, add adcoin adjustment" implies an Adjustment button should also appear on the leaderboard. Currently the Adjustment button only lives on `/transactions`, which super_admin no longer accesses. Adding a separate Adjustment button on the leaderboard is a feature change beyond the permission rewrite. **Recommendation**: surface to user as a follow-up task, not a regression.

### Branches code rules — observed state

- Existing data has companies with no codes (e.g. "Davinci Art" code = "—"). The new migration `019_branch_code_uniqueness.sql` uses `WHERE ... AND code IS NOT NULL` so it does not reject these existing nulls — but new inserts now require a code (server action `addBranchAction` and modal validation both enforce non-empty).
- Auto-code generator in branch-modal.tsx picks `siblings.length + 1` and disables manual editing for hq/branch — duplicates within the same company are practically impossible via the UI. The DB unique index + server-side `findCodeConflict` catch the company-code case.

## Test infrastructure note

agent-browser's `find role button click --name "..."` returned ✓ Done but did not actually trigger the modal in this app. Falling back to `eval "document.querySelector(...).click()"` worked. Likely a hidden overlay or pointer-events issue specific to the radix Dialog wrapper. Test-crud SKILL could note this as a known fallback.

## Pending follow-up

- Apply DB migration `src/db/migrations/019_branch_code_uniqueness.sql` via Supabase dashboard (Supabase MCP tools were not available in this run).
- Optional: surface "Add Adcoin Adjustment" on leaderboard if the user wants full spec coverage (not in current implementation).
