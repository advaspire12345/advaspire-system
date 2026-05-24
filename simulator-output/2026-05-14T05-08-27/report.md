# Simulator report — student-payment-then-sessions-update

**Run dir:** /Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T05-08-27
**Steps:** 4
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
course: "__sim_n00c77_PayPython"
package: "12-session"
date_of_birth: "2015-01-01"
gender: "male"
school_name: "Sim School"
branch: "Sim Pay Branch n00c"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T05-08-27/screenshots/1-actor-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T05-08-27/screenshots/1-observer-inst.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T05-08-27/screenshots/1-observer-ca.png`

### Step 2: `mark_present` as **inst**

```yaml
student: "PaySimStu1"
lesson: "Lesson 1"
mission: "Level 1"
activity: "intro"
branch: "Sim Pay Branch n00c"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T05-08-27/screenshots/2-actor-inst.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T05-08-27/screenshots/2-observer-aa.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T05-08-27/screenshots/2-observer-ca.png`

### Step 3: `mark_offline_paid` as **ca**

```yaml
student: "PaySimStu1"
branch: "Sim Pay Branch n00c"
```

**Error:** `mark_offline_paid: student "PaySimStu1" not found`

### Step 4: `approve_pending_payment` as **ca**

```yaml
student: "PaySimStu1"
branch: "Sim Pay Branch n00c"
```

**Error:** `approve_pending_payment: Approve button disabled for "PaySimStu1" — payment needs paid_at + receipt_photo first`

## Fixtures

```json
{
  "runId": "n00c77",
  "branchId": "99c28788-f547-4921-82c7-0c49514d41e9",
  "branchName": "__sim_n00c77_Sim Pay Branch",
  "courseId": "4a9ab44c-3fe2-41d1-a39d-4ca5c228cce4",
  "courseName": "__sim_n00c77_PayPython",
  "packageId": "4afda92f-4fe2-47e0-988f-9dbdd735681c",
  "users": [
    {
      "handle": "aa",
      "role": "assistant_admin",
      "id": "687248eb-d148-414d-acdb-7c6c652fcffc",
      "email": "__sim_n00c77_aa@sim.local",
      "profile": "lms-sim-n00c77-aa",
      "password": "simpass"
    },
    {
      "handle": "inst",
      "role": "instructor",
      "id": "5fc43661-7c47-499f-9d4f-9ddc82ee1606",
      "email": "__sim_n00c77_inst@sim.local",
      "profile": "lms-sim-n00c77-inst",
      "password": "simpass"
    },
    {
      "handle": "ca",
      "role": "company_admin",
      "id": "1ea0e74e-7eca-4ceb-93a7-ae52b72eab5e",
      "email": "__sim_n00c77_ca@sim.local",
      "profile": "lms-sim-n00c77-ca",
      "password": "simpass"
    }
  ],
  "createdVoucherCodes": [],
  "branchCity": "Sim Pay Branch n00c"
}
```