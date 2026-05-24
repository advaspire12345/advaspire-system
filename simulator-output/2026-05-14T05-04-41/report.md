# Simulator report — student-payment-then-sessions-update

**Run dir:** /Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T05-04-41
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
course: "__sim_2zncui_PayPython"
package: "12-session"
date_of_birth: "2015-01-01"
gender: "male"
school_name: "Sim School"
branch: "Sim Pay Branch 2znc"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T05-04-41/screenshots/1-actor-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T05-04-41/screenshots/1-observer-inst.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T05-04-41/screenshots/1-observer-ca.png`

### Step 2: `mark_present` as **inst**

```yaml
student: "PaySimStu1"
lesson: "Lesson 1"
mission: "Level 1"
activity: "intro"
branch: "Sim Pay Branch 2znc"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T05-04-41/screenshots/2-actor-inst.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T05-04-41/screenshots/2-observer-aa.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T05-04-41/screenshots/2-observer-ca.png`

### Step 3: `mark_offline_paid` as **ca**

```yaml
student: "PaySimStu1"
branch: "Sim Pay Branch 2znc"
```

**Error:** `mark_offline_paid: student "PaySimStu1" not found`

### Step 4: `approve_pending_payment` as **ca**

```yaml
student: "PaySimStu1"
branch: "Sim Pay Branch 2znc"
```

**Error:** `approve_pending_payment: Approve button disabled for "PaySimStu1" — payment needs paid_at + receipt_photo first`

## Fixtures

```json
{
  "runId": "2zncui",
  "branchId": "aeb4a3da-177e-43f1-884a-d04532f3852e",
  "branchName": "__sim_2zncui_Sim Pay Branch",
  "courseId": "a1b17ab2-da15-4e3c-89b8-e9baf8c0229a",
  "courseName": "__sim_2zncui_PayPython",
  "packageId": "4216098b-d142-4911-ad2f-7c9dd2ab845b",
  "users": [
    {
      "handle": "aa",
      "role": "assistant_admin",
      "id": "7b776e76-ac2f-4f2f-a080-e3c857fcc36d",
      "email": "__sim_2zncui_aa@sim.local",
      "profile": "lms-sim-2zncui-aa",
      "password": "simpass"
    },
    {
      "handle": "inst",
      "role": "instructor",
      "id": "42834568-501c-4a00-b896-6c22f9073799",
      "email": "__sim_2zncui_inst@sim.local",
      "profile": "lms-sim-2zncui-inst",
      "password": "simpass"
    },
    {
      "handle": "ca",
      "role": "company_admin",
      "id": "5cdb5c82-f1f1-4f4d-aa9e-ee3c801fd6e0",
      "email": "__sim_2zncui_ca@sim.local",
      "profile": "lms-sim-2zncui-ca",
      "password": "simpass"
    }
  ],
  "createdVoucherCodes": [],
  "branchCity": "Sim Pay Branch 2znc"
}
```