# Student Session Flows

Scenario-based examples covering enrollment, attendance, session tracking, pool sharing, expiry, and voucher mechanics.

---

## Scenario 1: Solo Enrollment — Session Package (4 Sessions)

**Setup:** Ali enrolls in Coding 101 with a **4-session package** (RM200).

| Step | Event | Sessions Remaining | Notes |
|------|-------|--------------------|-------|
| 1 | Payment approved | 4 | `enrollment.sessions_remaining = 4` |
| 2 | 1st attendance marked | 3 | `expires_at` set to **now + 2 months** |
| 3 | 2nd attendance | 2 | |
| 4 | 3rd attendance | 1 | |
| 5 | 4th attendance | 0 | Auto-creates pending renewal payment (RM200) |

**Expiry:** If Ali doesn't use all 4 sessions within 2 months from first attendance, enrollment expires.

---

## Scenario 2: Solo Enrollment — Monthly Package (1 Month)

**Setup:** Siti enrolls in Art Class with a **1-month package** (RM150). Monthly = 4 sessions per month.

| Step | Event | Sessions Remaining | Period |
|------|-------|--------------------|--------|
| 1 | Payment approved | 4 | `period_start` set |
| 2 | 1st attendance | 3 | Period: 1 Mar - 1 Apr |
| 3 | 2nd attendance | 2 | |
| 4 | 3rd attendance | 1 | |
| 5 | 4th attendance | 0 | Auto-creates renewal payment |

**Note:** Monthly packages reset at period boundaries. Sessions expire at period end.

---

## Scenario 3: Pool Creation — 2 Siblings with Session Absorption

**Setup:** Ali (8 sessions remaining) and Abu (4 sessions remaining) share a pool in Coding 101.

| Step | Event | Pool Remaining | Ali Display | Abu Display |
|------|-------|----------------|-------------|-------------|
| 1 | Create pool, Ali joins | 8 | — | — |
| 2 | Abu joins pool | 12 (8+4) | 6 | 6 |
| 3 | Ali attends | 11 | 5 | 6 |
| 4 | Abu attends | 10 | 5 | 5 |

**Absorption:** When a student joins a pool, their individual `sessions_remaining` is absorbed into `pool.sessions_remaining`.

**Display (positive pool):** `floor(pool.sessions_remaining / sibling_count)` + position bonus. All siblings see the same value — equal split of what's actually left.

---

## Scenario 4: Equal Split of Remaining Sessions

**Setup:** Pool has 7 sessions remaining, 3 siblings (Ali joined first, Abu second, Aminah third).

| Student | Position | Base (7÷3=2) | Remainder Bonus | Display |
|---------|----------|--------------|-----------------|---------|
| Ali | 0 | 2 | +1 (position < 1) | 3 |
| Abu | 1 | 2 | 0 | 2 |
| Aminah | 2 | 2 | 0 | 2 |

**Formula (positive pool):** `floor(pool.sessions_remaining / count)`, remainder distributed to earliest-joined first.

---

## Scenario 4b: Pool in Deficit — Per-Student Tracking

**Setup:** Ali and Abu share a pool in Coding 101. No payment made yet. Abu attends 3 classes.

| Step | Event | Pool Remaining | Ali Display | Abu Display |
|------|-------|----------------|-------------|-------------|
| 1 | Pool created (no payment) | 0 | 0 | 0 |
| 2 | Abu attends ×3 | -3 | **0** | **-3** |
| 3 | Payment approved (4 sessions) | 1 (-3+4) | **1** | **0** |

**Formula (negative pool):** `floor(pool.total_sessions / count) + positionBonus - my_pool_attendance`. Only the student who actually attended goes negative — the other stays at 0.

**After payment:** pool.sessions_remaining becomes positive → switches to equal split. 1 remaining ÷ 2 = 0 each, remainder 1 → Ali (earlier) gets 1, Abu gets 0.

---

## Scenario 5: Cancel/Complete from 3-Sibling Pool — Pool Continues

### 5a: All siblings have 0 sessions

**Setup:** Ali, Abu, and Aminah share a pool (0 sessions remaining). Aminah is cancelled.

| Step | Event | Pool Remaining | Active Members | Ali | Abu | Aminah |
|------|-------|----------------|----------------|-----|-----|--------|
| 1 | Initial | 0 | 3 | 0 | 0 | 0 |
| 2 | Aminah cancelled | 0 | 2 (Ali, Abu) | **0** | **0** | **0** |

Pool stays, sessions remain 0. Just the member list shrinks.

### 5b: Siblings have sessions

**Setup:** Ali, Abu, and Aminah share a pool (6 sessions remaining, 2 each). Aminah is cancelled.

| Step | Event | Pool Remaining | Active Members | Ali | Abu | Aminah |
|------|-------|----------------|----------------|-----|-----|--------|
| 1 | Initial | 6 | 3 | 2 | 2 | 2 |
| 2 | Aminah cancelled | 6 | 2 (Ali, Abu) | **3** | **3** | **0** |

Pool stays with 6 sessions. Now split among 2: `floor(6/2) = 3` each.

**Process (both 5a and 5b):**
1. Cancelled student removed from `pool_students` — pool stays active
2. Pool sessions unchanged — auto-redistribute among remaining members
3. Cancelled student shows **0** (inactive status always shows 0)
4. `enrollment.pool_id` preserved as breadcrumb for restoration

**Key Rule:** 3+ siblings → 1 cancels → pool **stays active**, sessions redistribute.

---

## Scenario 6: Cancel/Complete from 2-Sibling Pool — Auto-Convert to Individual

### 6a: Both siblings have 0 sessions

**Setup:** Ali and Abu share a pool (0 sessions remaining). Abu is cancelled.

| Step | Event | Ali | Abu | Package Type |
|------|-------|-----|-----|--------------|
| 1 | Initial | 0 (pooled) | 0 (pooled) | Pool |
| 2 | Abu cancelled | **0** (individual) | **0** | **Individual** |

Ali becomes individual with 0 sessions. Pool soft-deleted.

### 6b: Both siblings have sessions

**Setup:** Ali and Abu share a pool (4 sessions remaining, 2 each). Abu is cancelled.

| Step | Event | Ali | Abu | Package Type |
|------|-------|-----|-----|--------------|
| 1 | Initial | 2 (pooled) | 2 (pooled) | Pool |
| 2 | Abu cancelled | **4** (individual) | **0** | **Individual** |

Ali gets ALL pool.sessions_remaining (4 = 2+2). Pool soft-deleted.

### 6c: Restoration — Revert back to pool

**Setup:** Continuing from 6b. Admin sets Abu back to `active`.

| Step | Event | Ali | Abu | Package Type |
|------|-------|-----|-----|--------------|
| 1 | After cancel | 4 (individual) | 0 (cancelled) | Individual |
| 2 | Abu restored to active | **2** (pooled) | **2** (pooled) | **Pool** |

Abu's `enrollment.pool_id` breadcrumb finds the soft-deleted pool. Pool is un-deleted, both Ali and Abu re-added to `pool_students`. Ali's 4 sessions absorbed back into pool → `pool.sessions_remaining = 4`, split: `floor(4/2) = 2` each.

**Process:**
1. Abu removed from `pool_students`
2. Only 1 member (Ali) remains → **auto-convert to individual**:
   - Ali's `enrollment.sessions_remaining` = `pool.sessions_remaining`
   - Ali removed from `pool_students` (but `enrollment.pool_id` kept as breadcrumb)
   - Pool is soft-deleted
3. Abu shows 0 (cancelled), Ali shows as individual
4. On restoration: pool un-deleted, restored student + breadcrumb siblings all re-added to pool

**Key Rules:**
- 2-sibling pool → 1 cancels → **pool auto-dissolves**, remaining student becomes individual
- The remaining student gets ALL of `pool.sessions_remaining`
- Both students keep `enrollment.pool_id` as breadcrumb for restoration
- On restoration: pool is un-deleted, ALL siblings with the breadcrumb are re-added → reverts back to pool

---

## Scenario 7: Restoration After Expiry

**Setup:** Ali's enrollment expired due to non-payment. Admin wants to restore.

| Step | Action | Result |
|------|--------|--------|
| 1 | Ali's enrollment status = `expired` | Removed from pool if pooled |
| 2 | Admin creates new payment for Ali | New pending payment |
| 3 | Payment approved | Sessions added, status → `active` |
| 4 | If pooled, re-add to pool | Sessions absorbed into pool |

**Note:** Restoration requires a new payment cycle. The student re-enters the system as if newly enrolled.

---

## Scenario 8: Separate to Shared Transition

**Setup:** Ali and Abu each have individual 12-session packages in Coding 101. Parent requests sharing.

| Step | Event | Ali Sessions | Abu Sessions | Pool Sessions |
|------|-------|-------------|-------------|---------------|
| 1 | Before | 8 (individual) | 10 (individual) | - |
| 2 | Create pool | 0 | 0 | 18 (8+10) |
| 3 | Split display | - | - | Ali: 9, Abu: 9 |

**Process:**
1. Create `shared_session_pool` for the course
2. `addStudentToPool()` absorbs each student's remaining sessions
3. Individual enrollment sessions reset to 0
4. Pool sessions split equally for display

**Note:** The "Shared" button appears in the edit modal whenever the student has siblings under the same parent enrolled in the same course — even if the student is currently individual. This allows re-sharing at any time.

---

## Scenario 8b: Pool Dissolution — Shared to Individual

**Setup:** Ali and Abu share a pool in Coding 101. They've used all sessions and the renewal payment is still pending (not yet paid). Admin unselects the pool for one sibling.

| Step | Event | Ali | Abu | Pool |
|------|-------|-----|-----|------|
| 1 | Initial (sessions depleted) | 0 (pooled) | 0 (pooled) | 0 sessions, pending renewal |
| 2 | Admin unselects pool for Abu | Individual | Individual | **Pool dissolved** |
| 3 | Each gets own pending payment | Pending (individual) | Pending (individual) | — |
| 4 | Admin opens Ali's edit modal | Shared button **still visible** | — | — |
| 5 | Admin clicks Shared again | Ali & Abu re-pooled | Ali & Abu re-pooled | New pool created |

**When Pool Dissolution Is Allowed:**
- Students have **used up all sessions** and renewal payment is **not yet paid** (pending)
- OR students are **newly enrolled** and have **not yet made any payment**

**When Pool Dissolution Is NOT Allowed:**
- Students have **active sessions remaining** in the pool (sessions > 0)
- Shared button is **disabled** (grayed out) — clicking does nothing
- Backend also guards: dissolution is silently skipped even if somehow submitted

**Process:**
1. Admin unselects "Share with sibling" for any one student in the pool
2. **All siblings** in that pool become individual — the entire pool is dissolved
3. Each student's enrollment is detached from the pool (`pool_id` cleared)
4. The shared pending payment (if any) is removed
5. Each student gets their own individual pending renewal payment (if sessions were depleted)
6. The pool record itself is deleted

**Re-sharing After Dissolution:**
- After dissolution, each student is individual but still under the same parent
- The edit modal detects siblings in the same course via the sibling check API
- The "Shared" button remains visible with sibling names — admin can click it to re-create the pool
- This works the same as Scenario 8 (Separate to Shared Transition)

**Key Rules:**
- Unselecting **one** sibling dissolves the **entire** pool — partial pool removal is not supported in this flow
- This is different from Scenario 6 (cancellation) where the pool continues with remaining siblings
- Pool dissolution is only available when no active paid sessions exist in the pool
- The "Shared" button appears whenever siblings share the same parent and course — regardless of current pool status

---

## Scenario 8c: Individual to Shared with Negative Sessions (Attended Without Payment)

**Setup:** Ali has an individual enrollment in Coding 101. He was marked present 3 times but has **not yet paid** (no sessions allocated). Admin then switches Ali to share a pool with sibling Abu.

| Step | Event | Ali Sessions | Abu Sessions | Pool Sessions |
|------|-------|-------------|-------------|---------------|
| 1 | Ali marked present ×3 (no payment) | -3 (individual) | — | — |
| 2 | Admin clicks "Shared" in Ali's edit modal | — | — | — |
| 3 | Pool created, Ali + Abu join | 0 | 0 | **-3** (Ali's debt absorbed) |
| 4 | Shared pending payment created | — | — | -3, pending renewal |
| 5 | Admin approves payment (12-session) | — | — | -3 + 12 = **9** |
| 6 | Split display | — | — | Ali: 5, Abu: 4 |

**How It Works:**
1. When `addStudentToPool()` is called, it reads the enrollment's `sessions_remaining` — including **negative** values
2. Negative sessions are absorbed into `pool.sessions_remaining` (reducing it), preserving the attendance debt
3. The enrollment's `sessions_remaining` is reset to 0 (now tracked by pool)
4. `total_sessions` is only increased for positive leftovers (negative sessions are debt, not new capacity)
5. When the shared payment is approved, the new sessions are added on top of the negative balance

**Key Rules:**
- Negative sessions (attendance debt) are **never lost** — they carry into the pool
- Period active display reflects the pool's true balance (can be negative)
- The debt is settled when the next payment is approved and sessions are added
- This applies to both `addStudentToPool()` and `restoreStudentToPool()`

---

## Scenario 9: Auto-Renewal Payment

**Setup:** Ali has 4-session package. Uses all sessions.

| Step | Event | Sessions | Payment Status |
|------|-------|----------|----------------|
| 1 | Start | 4 | - |
| 2 | 4 attendances | 0 | Auto-creates pending payment |
| 3 | Goes negative (-1) | -1 | Pending payment still exists |
| 4 | Admin approves payment | 3 (was -1 + 4) | Paid |

**Key:** Sessions can go negative. The system auto-creates a renewal payment when sessions hit 0. Approving adds the new package sessions on top of the current (possibly negative) count.

---

## Scenario 10: 3 Siblings Sharing a Pool — Hybrid Display

**Setup:** Ali, Abu, and Aminah share a 12-session pool in Coding 101 (RM300).

| Step | Event | Pool Remaining | Ali | Abu | Aminah |
|------|-------|----------------|-----|-----|--------|
| 1 | Payment approved | 12 | 4 | 4 | 4 |
| 2 | Ali attends | 11 | 3 | 4 | 4 |
| 3 | Ali attends | 10 | 3 | 3 | 4 |
| 4 | Abu attends | 9 | 3 | 3 | 3 |
| 5 | Aminah attends ×3 | 6 | 2 | 2 | 2 |
| 6 | Ali attends ×2 | 4 | 1 | 1 | 1 |
| 7 | Abu attends ×3 | 1 | 0 | 0 | 1 |
| 8 | Aminah attends | 0 | 0 | 0 | 0 |

**Positive pool display:** `floor(pool.sessions_remaining / count)` + position bonus. All siblings see the **same** value (equal split of what's left). When one sibling attends, ALL siblings' display updates because pool.sessions_remaining decreases.

**Deduction:** Each attendance deducts 1 from `pool.sessions_remaining`.

**Renewal:** When pool reaches 0, a single shared renewal payment is created.

**Negative pool (over-usage):** If Abu attends one more (step 9, pool goes to -1), the display switches to **per-student tracking**: `floor(total_sessions / count) + bonus - my_attendance`. Only the student who attended goes negative — siblings stay at 0.

**Cancel from 3-sibling pool:** If Aminah is cancelled at step 5 (pool=6, 2 remaining): pool stays, `floor(6/2) = 3` each for Ali and Abu.

---

## Scenario 11: Fast-Usage Voucher

**Setup:** Ali has a 12-session package (RM300) with:
- `expiry_months = 6` (sessions expire in 6 months)
- `voucher_deadline_months = 3` (use all within 3 months for voucher)
- `voucher_amount = RM50`

| Step | Event | Sessions | Timeline |
|------|-------|----------|----------|
| 1 | 1st attendance (1 Jan) | 11 | `expires_at` = 1 Jul |
| 2 | Uses all 12 by 15 Feb | 0 | Within 3-month deadline |
| 3 | System checks deadline | - | 15 Feb < 1 Apr (deadline) |
| 4 | Voucher created | - | RM50 voucher, status = `available` |

**Eligibility:** All sessions must be used within `voucher_deadline_months` from the first attendance date.

---

## Scenario 12: Session Expiry

**Setup:** Ali has 4-session package, `expiry_months = 2`. First attendance on 1 Jan.

| Step | Event | Sessions | Date |
|------|-------|----------|------|
| 1 | 1st attendance | 3 | 1 Jan → `expires_at` = 1 Mar |
| 2 | 2nd attendance | 2 | 15 Jan |
| 3 | No more attendance | 2 | ... |
| 4 | On-demand check | 0 | 2 Mar: `expires_at < now()` → expire |

**Expiry Process:**
1. `checkAndExpireEnrollments()` runs on page load (student, attendance, dashboard pages)
2. Finds active enrollments where `expires_at < now()`
3. Sets enrollment status to `expired`
4. Forfeits remaining sessions (set to 0)
5. If pooled: removes student from pool, redistributes remaining pool sessions

---

## Scenario 13: Voucher Redemption

**Setup:** Ali earned a RM50 voucher from fast usage. Next payment is RM300 for 12-session package.

| Step | Event | Amount | Voucher Status |
|------|-------|--------|----------------|
| 1 | Pending payment created | RM300 | Voucher: `available` |
| 2 | Table shows "Yes" in Voucher column | - | Auto-detected |
| 3 | Admin opens approve modal | Shows "RM50 discount applied" | |
| 4 | Approve payment | Net: RM250 (RM300 - RM50) | Voucher: `redeemed` |

**Auto-Apply Process:**
1. System checks `vouchers` table for student + course with status `available`
2. If found, voucher is auto-selected (no manual selection needed)
3. On approval: `payment.voucher_id` set, `payment.discount_amount = 50`
4. Voucher status → `redeemed`, `redeemed_at` set, `redeemed_payment_id` linked

---

## Scenario 14: Shared Pool Invoice — Frozen Snapshot with Equal Split

**Setup:** Ali and Abu share a 4-session pool in Coding 101 (RM200). Payment is approved.

**Invoice Display (frozen at payment approval):**

| # | Code | Product | QTY | Rate | Amount |
|---|------|---------|-----|------|--------|
| 1 | COD101 | Coding 101 - 2 Sessions (Ali) | 1 | RM100.00 | RM100.00 |
| 2 | COD101 | Coding 101 - 2 Sessions (Abu) | 1 | RM100.00 | RM100.00 |
| | | | | **TOTAL** | **RM200.00** |

**Split Calculation:** `sessions_per_sibling = floor(total_sessions / sibling_count)` → 4 / 2 = 2 sessions each. `rate_per_sibling = total_price / sibling_count` → RM200 / 2 = RM100 each.

**Key Rules:**
- Invoice uses **equal split** per sibling — no per-session attendance tracking
- All invoice data is **frozen as a snapshot** when payment is approved (`invoice_snapshot` JSONB column)
- Even if a sibling is later cancelled, the invoice still shows the original siblings
- Even if company name, branch info, or student names change later, the invoice remains unchanged
- The snapshot includes: company info, student names, sibling names, course, package, price, items

---

## Scenario 15: Payment Record Immutability — 1-Week Grace Period

**Setup:** A payment record was created on 1 Jan. Admin wants to edit it.

| Timeframe | What Can Change | What Cannot Change |
|-----------|----------------|--------------------|
| Within 1 week (1 Jan – 8 Jan) | Student names, sibling names, course, package, items, price | — |
| After 1 week (9 Jan onwards) | **Nothing** — record is fully locked | Everything |

**Process:**
1. When payment is approved → `invoice_snapshot` is created and saved to the payment record
2. Within 1 week → admin can edit student names, sibling names, course, package, items; invoice renders from **live data** so changes are reflected; snapshot is **re-created** after each edit
3. After 1 week → edit/delete buttons show "Locked"; server rejects any update attempts; invoice renders from the **frozen snapshot**

**What the snapshot captures (frozen after 1 week):**
- Bill-to name and address (parent info)
- Student name and sibling names (from pool)
- Course name, code, package name, duration, type
- Price and line items (with equal split for shared packages)
- Branch company name, address, phone, email, bank details

**Key Rule:** Within 1 week the invoice is **live** and reflects any edits. After 1 week it becomes a **historical document** frozen from the last snapshot.

---

## Scenario 16: Multiple Attendance Slots on Same Day

**Setup:** Ali has Coding 101. Admin needs to record multiple sessions on the same day.

| Step | Event | Date | Time | Result |
|------|-------|------|------|--------|
| 1 | Mark scheduled slot | Monday | 10:00 AM | Created — session deducted |
| 2 | Take Attendance (extra) | Monday | 3:00 PM | Created — session deducted |
| 3 | Take Attendance (extra) | Monday | 5:00 PM | Created — session deducted |
| 4 | Try duplicate | Monday | 10:00 AM | **Blocked** — same day+time already exists |

**Duplicate Prevention Rules:**
- Same day + **same time** → blocked (409 error)
- Same day + **different time** → allowed (new attendance record created, no limit)
- Cross-enrollment: same student cannot have attendance at the same day+time in any program

**How It Works:**
1. API checks duplicates by comparing both `actual_day` AND `actual_start_time` (not just date)
2. `markAttendance()` matches existing records by `slot_day + slot_time` first, then falls back to `date + actual_start_time`
3. Existing record matching always considers the time — a record at 10:00 AM is never confused with one at 3:00 PM, even on the same date
4. If no existing record matches the requested time, a **new** record is always created
5. Each attendance record deducts 1 session regardless of time slot

---

## Scenario 17: Package Upgrade via Payment — Student Table Reflects Latest

**Setup:** Jacky is enrolled in Lego EV3 Robotics with a **4-session package** (RM220). He uses all sessions. A renewal pending payment is auto-created. Admin changes the package to **12-session** (RM627) before approving.

| Step | Event | Payment `package_id` | Student Table Package |
|------|-------|---------------------|-----------------------|
| 1 | Jacky uses all 4 sessions | — | 4 sessions |
| 2 | Auto-renewal pending payment created | `938ca921` (4-session) | 4 sessions |
| 3 | Admin edits pending payment → 12-session (RM627) | `9d321af5` (12-session) | 4 sessions (still pending) |
| 4 | Admin approves payment | `9d321af5` (12-session, status=paid) | **12 sessions** |

**How It Works:**
1. Every payment stores `package_id` referencing `course_pricing` — set when the payment is created or edited
2. On approval, `approvePayment()` also sets `package_id` on the payment if not already set (lookup by `course_id + amount`)
3. The student table reads the **latest paid payment's `package_id`** (sorted by `paid_at` descending), NOT the enrollment's original `package_id`
4. The edit modal also initializes from the same `packageId`, `packageType`, and `packageDuration` — so it reflects the latest package too

**Key Rules:**
- `payments.package_id` references `course_pricing` (not the legacy `packages` table)
- The student table package column and edit modal both show the **latest paid** payment's package
- If no paid payment has `package_id`, falls back to the enrollment's original package
- For pooled students, pool sibling payments are also checked (via `poolPaymentCacheRaw`)

---

## Configuration Reference

### Pricing Expiry/Voucher Fields

| Package | `expiry_months` | `voucher_deadline_months` | `voucher_amount` |
|---------|----------------|--------------------------|------------------|
| 4 sessions | 2 | 1 | Configurable |
| 12 sessions | 6 | 3 | Configurable |
| 24 sessions | 12 | 6 | Configurable |

### Key Rules

1. **`expires_at` is set on first attendance** — not on payment approval
2. **Expiry check is on-demand** — runs when student/attendance/dashboard pages load
3. **Voucher is auto-applied** — system finds best available voucher during approval
4. **Pool expiry triggers redistribution** — remaining pool sessions split among active members
5. **Sessions can go negative** — renewal payments are created proactively at 0
6. **Invoice snapshot is frozen at payment approval** — immutable after 1 week, equal split for shared packages
7. **Payment records locked after 1 week** — only package editable within grace period
8. **Student table shows latest paid package** — not enrollment's original package; edit modal matches
9. **Pool display is hybrid** — when pool.sessions_remaining >= 0: all siblings see the same equal split (`floor(remaining / count)`); when pool is negative: per-student tracking (`share_of_total - my_attendance`) so only the student who attended goes negative
10. **Pool cancel/complete auto-sizing** — 3+ siblings → 1 cancels: pool stays, sessions redistribute among remaining; 2 siblings → 1 cancels: pool auto-dissolves, remaining student becomes individual with all pool sessions; cancelled student keeps 0 sessions in all cases
11. **Pool restoration reverts** — when a cancelled student is restored to active, the pool is un-deleted and ALL siblings with the pool_id breadcrumb are re-added; sessions are re-absorbed into the pool and shared again
12. **Individual-to-pool transition** — when siblings switch from individual to pool, their sessions are absorbed into `pool.sessions_remaining`; display uses the hybrid formula above
