# Simulator report — student-payment-then-sessions-update

**Run dir:** /Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-13T12-52-39
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
course: "__sim_kiqtij_PayPython"
package: "12-session"
date_of_birth: "2015-01-01"
gender: "male"
school_name: "Sim School"
branch: "Sim Pay Branch kiqt"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-13T12-52-39/screenshots/1-actor-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-13T12-52-39/screenshots/1-observer-inst.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-13T12-52-39/screenshots/1-observer-ca.png`

### Step 2: `mark_present` as **inst**

```yaml
student: "PaySimStu1"
lesson: "Lesson 1"
mission: "Level 1"
activity: "intro"
branch: "Sim Pay Branch kiqt"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-13T12-52-39/screenshots/2-actor-inst.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-13T12-52-39/screenshots/2-observer-aa.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-13T12-52-39/screenshots/2-observer-ca.png`

### Step 3: `approve_pending_payment` as **ca**

```yaml
student: "PaySimStu1"
branch: "Sim Pay Branch kiqt"
```

**Error:** `approve_pending_payment: Approve button disabled for "PaySimStu1" — payment needs paid_at + receipt_photo first`

## Fixtures

```json
{
  "runId": "kiqtij",
  "branchId": "9c795be8-791e-4e11-b974-403b4f35f25c",
  "branchName": "__sim_kiqtij_Sim Pay Branch",
  "courseId": "35912299-c3b9-4a94-bbb9-d1abe791f8ad",
  "courseName": "__sim_kiqtij_PayPython",
  "packageId": "b1e1721b-5a45-4a72-b7f8-949f610900bc",
  "users": [
    {
      "handle": "aa",
      "role": "assistant_admin",
      "id": "f4dd87be-47d1-4fc3-89c7-03c1fec2097f",
      "email": "__sim_kiqtij_aa@sim.local",
      "profile": "lms-sim-kiqtij-aa",
      "password": "simpass"
    },
    {
      "handle": "inst",
      "role": "instructor",
      "id": "a835831a-b38a-44fd-ad9d-4bcd2b821892",
      "email": "__sim_kiqtij_inst@sim.local",
      "profile": "lms-sim-kiqtij-inst",
      "password": "simpass"
    },
    {
      "handle": "ca",
      "role": "company_admin",
      "id": "f47bf905-4585-41b6-8288-1c68238db82a",
      "email": "__sim_kiqtij_ca@sim.local",
      "profile": "lms-sim-kiqtij-ca",
      "password": "simpass"
    }
  ],
  "createdVoucherCodes": [],
  "branchCity": "Sim Pay Branch kiqt"
}
```