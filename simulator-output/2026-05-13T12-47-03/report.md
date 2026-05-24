# Simulator report — student-payment-then-sessions-update

**Run dir:** /Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-13T12-47-03
**Steps:** 3
**Drift findings:** 12

## ❌ Drift / failure findings

| Step | Role | Field | DOM | DB | Expected | Result |
|------|------|-------|-----|-----|----------|--------|
| 1 | instructor | `/attendance.row_visible(PaySimStu1)` | false | — | true | ❌ DRIFT (DOM != expected) |
| 1 | instructor | `pending_payments_table.row_visible` | — | 0 | true | ❌ DB_FAIL |
| 1 | company_admin | `/student.row_visible(PaySimStu1)` | false | — | true | ❌ DRIFT (DOM != expected) |
| 1 | company_admin | `pending_payments_table.row_visible` | — | 0 | true | ❌ DB_FAIL |
| 2 | assistant_admin | `/student.row_visible(PaySimStu1)` | false | — | true | ❌ DRIFT (DOM != expected) |
| 2 | assistant_admin | `attendance_table.sessions_remaining` | — | 0 | -1 | ❌ DB_FAIL |
| 2 | assistant_admin | `mark_present_modal.sessions_remaining` | — | 0 | -1 | ❌ DB_FAIL |
| 2 | assistant_admin | `student_table.period_active` | — | 0 | -1 | ❌ DB_FAIL |
| 2 | company_admin | `/student.row_visible(PaySimStu1)` | false | — | true | ❌ DRIFT (DOM != expected) |
| 2 | company_admin | `attendance_table.sessions_remaining` | — | 0 | -1 | ❌ DB_FAIL |
| 2 | company_admin | `mark_present_modal.sessions_remaining` | — | 0 | -1 | ❌ DB_FAIL |
| 2 | company_admin | `student_table.period_active` | — | 0 | -1 | ❌ DB_FAIL |

## Full checkpoint table

| Step | Role | Field | DOM | DB | Expected | Result |
|------|------|-------|-----|-----|----------|--------|
| 1 | instructor | `/attendance.row_visible(PaySimStu1)` | false | — | true | ❌ DRIFT (DOM != expected) |
| 1 | instructor | `student_table.period_active` | — | 0 | 0 | ✅ |
| 1 | instructor | `pending_payments_table.row_visible` | — | 0 | true | ❌ DB_FAIL |
| 1 | company_admin | `/student.row_visible(PaySimStu1)` | false | — | true | ❌ DRIFT (DOM != expected) |
| 1 | company_admin | `student_table.period_active` | — | 0 | 0 | ✅ |
| 1 | company_admin | `pending_payments_table.row_visible` | — | 0 | true | ❌ DB_FAIL |
| 2 | assistant_admin | `/student.row_visible(PaySimStu1)` | false | — | true | ❌ DRIFT (DOM != expected) |
| 2 | assistant_admin | `attendance_table.sessions_remaining` | — | 0 | -1 | ❌ DB_FAIL |
| 2 | assistant_admin | `mark_present_modal.sessions_remaining` | — | 0 | -1 | ❌ DB_FAIL |
| 2 | assistant_admin | `student_table.period_active` | — | 0 | -1 | ❌ DB_FAIL |
| 2 | company_admin | `/student.row_visible(PaySimStu1)` | false | — | true | ❌ DRIFT (DOM != expected) |
| 2 | company_admin | `attendance_table.sessions_remaining` | — | 0 | -1 | ❌ DB_FAIL |
| 2 | company_admin | `mark_present_modal.sessions_remaining` | — | 0 | -1 | ❌ DB_FAIL |
| 2 | company_admin | `student_table.period_active` | — | 0 | -1 | ❌ DB_FAIL |

## Per-step breakdown

### Step 1: `add_student` as **aa**

```yaml
name: "PaySimStu1"
parent_name: "Pay Parent 1"
parent_email: "pp1@sim.local"
parent_phone: "0123456789"
course: "__sim_m31fhp_PayPython"
package: "12-session"
date_of_birth: "2015-01-01"
gender: "male"
school_name: "Sim School"
branch: "Sim Pay Branch m31f"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-13T12-47-03/screenshots/1-actor-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-13T12-47-03/screenshots/1-observer-inst.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-13T12-47-03/screenshots/1-observer-ca.png`

### Step 2: `mark_present` as **inst**

```yaml
student: "PaySimStu1"
lesson: "Lesson 1"
mission: "Level 1"
activity: "intro"
branch: "Sim Pay Branch m31f"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-13T12-47-03/screenshots/2-actor-inst.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-13T12-47-03/screenshots/2-observer-aa.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-13T12-47-03/screenshots/2-observer-ca.png`

### Step 3: `approve_pending_payment` as **ca**

```yaml
student: "PaySimStu1"
branch: "Sim Pay Branch m31f"
```

**Error:** `clickButton: no button matching "Approve payment for PaySimStu1" in snapshot`

## Fixtures

```json
{
  "runId": "m31fhp",
  "branchId": "677589b6-850d-4d20-8102-e542e9b7630e",
  "branchName": "__sim_m31fhp_Sim Pay Branch",
  "courseId": "274ce4ad-4fed-4a99-a217-d8fd0fdef81f",
  "courseName": "__sim_m31fhp_PayPython",
  "packageId": "9af8858c-55c7-4ed6-86b2-2980eb4f6e68",
  "users": [
    {
      "handle": "aa",
      "role": "assistant_admin",
      "id": "9e902a11-da04-4e59-8321-2de71249d170",
      "email": "__sim_m31fhp_aa@sim.local",
      "profile": "lms-sim-m31fhp-aa",
      "password": "simpass"
    },
    {
      "handle": "inst",
      "role": "instructor",
      "id": "1476f033-f531-4589-b5bd-5c74211d1da3",
      "email": "__sim_m31fhp_inst@sim.local",
      "profile": "lms-sim-m31fhp-inst",
      "password": "simpass"
    },
    {
      "handle": "ca",
      "role": "company_admin",
      "id": "83d95ce6-b595-4448-a3a1-11eccf6a37ec",
      "email": "__sim_m31fhp_ca@sim.local",
      "profile": "lms-sim-m31fhp-ca",
      "password": "simpass"
    }
  ],
  "createdVoucherCodes": [],
  "branchCity": "Sim Pay Branch m31f"
}
```