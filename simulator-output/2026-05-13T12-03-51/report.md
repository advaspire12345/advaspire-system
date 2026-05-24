# Simulator report — student-payment-then-sessions-update

**Run dir:** /Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-13T12-03-51
**Steps:** 3
**Drift findings:** 6

## ❌ Drift / failure findings

| Step | Role | Field | DOM | DB | Expected | Result |
|------|------|-------|-----|-----|----------|--------|
| 1 | instructor | `/attendance.row_visible(PaySimStu1)` | false | — | true | ❌ DRIFT (DOM != expected) |
| 1 | instructor | `student_table.period_active` | — | null | 0 | ❌ DB_FAIL |
| 1 | instructor | `pending_payments_table.row_visible` | — | null | true | ❌ DB_FAIL |
| 1 | company_admin | `/student.row_visible(PaySimStu1)` | false | — | true | ❌ DRIFT (DOM != expected) |
| 1 | company_admin | `student_table.period_active` | — | null | 0 | ❌ DB_FAIL |
| 1 | company_admin | `pending_payments_table.row_visible` | — | null | true | ❌ DB_FAIL |

## Full checkpoint table

| Step | Role | Field | DOM | DB | Expected | Result |
|------|------|-------|-----|-----|----------|--------|
| 1 | instructor | `/attendance.row_visible(PaySimStu1)` | false | — | true | ❌ DRIFT (DOM != expected) |
| 1 | instructor | `student_table.period_active` | — | null | 0 | ❌ DB_FAIL |
| 1 | instructor | `pending_payments_table.row_visible` | — | null | true | ❌ DB_FAIL |
| 1 | company_admin | `/student.row_visible(PaySimStu1)` | false | — | true | ❌ DRIFT (DOM != expected) |
| 1 | company_admin | `student_table.period_active` | — | null | 0 | ❌ DB_FAIL |
| 1 | company_admin | `pending_payments_table.row_visible` | — | null | true | ❌ DB_FAIL |

## Per-step breakdown

### Step 1: `add_student` as **aa**

```yaml
name: "PaySimStu1"
parent_name: "Pay Parent 1"
parent_email: "pp1@sim.local"
parent_phone: "0123456789"
course: "__sim_7xr2pu_PayPython"
package: "12-session"
date_of_birth: "2015-01-01"
gender: "male"
school_name: "Sim School"
branch: "Sim Pay Branch 7xr2"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-13T12-03-51/screenshots/1-actor-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-13T12-03-51/screenshots/1-observer-inst.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-13T12-03-51/screenshots/1-observer-ca.png`

### Step 2: `mark_present` as **inst**

```yaml
student: "PaySimStu1"
lesson: "Lesson 1"
mission: "Level 1"
activity: "intro"
branch: "Sim Pay Branch 7xr2"
```

**Error:** `clickButton: no button matching "Mark PaySimStu1 as present" in snapshot`

### Step 3: `approve_pending_payment` as **ca**

```yaml
student: "PaySimStu1"
branch: "Sim Pay Branch 7xr2"
```

**Error:** `clickButton: no button matching "Approve payment for PaySimStu1" in snapshot`

## Fixtures

```json
{
  "runId": "7xr2pu",
  "branchId": "b75dd0ae-1b99-4bf0-a0c1-7bf14809a850",
  "branchName": "__sim_7xr2pu_Sim Pay Branch",
  "courseId": "f14b8cc7-d464-4285-96cd-6e3706b42aba",
  "courseName": "__sim_7xr2pu_PayPython",
  "packageId": "903aad70-a5b1-4090-8096-07f9b59327f9",
  "users": [
    {
      "handle": "aa",
      "role": "assistant_admin",
      "id": "a52902ca-64bf-4bfa-8156-76c185754fff",
      "email": "__sim_7xr2pu_aa@sim.local",
      "profile": "lms-sim-7xr2pu-aa",
      "password": "simpass"
    },
    {
      "handle": "inst",
      "role": "instructor",
      "id": "d05c028e-4f95-463b-8ea4-7e96e99f51c9",
      "email": "__sim_7xr2pu_inst@sim.local",
      "profile": "lms-sim-7xr2pu-inst",
      "password": "simpass"
    },
    {
      "handle": "ca",
      "role": "company_admin",
      "id": "0748d80e-661f-4cd4-bfe1-086d44254b81",
      "email": "__sim_7xr2pu_ca@sim.local",
      "profile": "lms-sim-7xr2pu-ca",
      "password": "simpass"
    }
  ],
  "createdVoucherCodes": [],
  "branchCity": "Sim Pay Branch 7xr2"
}
```