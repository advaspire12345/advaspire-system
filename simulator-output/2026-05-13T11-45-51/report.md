# Simulator report — student-payment-then-sessions-update

**Run dir:** /Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-13T11-45-51
**Steps:** 3
**Drift findings:** 4

## ❌ Drift / failure findings

| Step | Role | Field | DOM | DB | Expected | Result |
|------|------|-------|-----|-----|----------|--------|
| 1 | instructor | `/attendance.row_visible(PaySimStu1)` | false | — | true | ❌ DRIFT (DOM != expected) |
| 1 | instructor | `pending_payments_table.row_visible` | — | 0 | true | ❌ DB_FAIL |
| 1 | company_admin | `/student.row_visible(PaySimStu1)` | false | — | true | ❌ DRIFT (DOM != expected) |
| 1 | company_admin | `pending_payments_table.row_visible` | — | 0 | true | ❌ DB_FAIL |

## Full checkpoint table

| Step | Role | Field | DOM | DB | Expected | Result |
|------|------|-------|-----|-----|----------|--------|
| 1 | instructor | `/attendance.row_visible(PaySimStu1)` | false | — | true | ❌ DRIFT (DOM != expected) |
| 1 | instructor | `student_table.period_active` | — | 0 | 0 | ✅ |
| 1 | instructor | `pending_payments_table.row_visible` | — | 0 | true | ❌ DB_FAIL |
| 1 | company_admin | `/student.row_visible(PaySimStu1)` | false | — | true | ❌ DRIFT (DOM != expected) |
| 1 | company_admin | `student_table.period_active` | — | 0 | 0 | ✅ |
| 1 | company_admin | `pending_payments_table.row_visible` | — | 0 | true | ❌ DB_FAIL |

## Per-step breakdown

### Step 1: `add_student` as **aa**

```yaml
name: "PaySimStu1"
parent_name: "Pay Parent 1"
parent_email: "pp1@sim.local"
parent_phone: "0123456789"
course: "__sim_a9assi_PayPython"
package: "12-session"
date_of_birth: "2015-01-01"
gender: "male"
school_name: "Sim School"
branch: "Sim Pay Branch a9as"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-13T11-45-51/screenshots/1-actor-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-13T11-45-51/screenshots/1-observer-inst.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-13T11-45-51/screenshots/1-observer-ca.png`

### Step 2: `mark_present` as **inst**

```yaml
student: "PaySimStu1"
lesson: "Lesson 1"
mission: "Level 1"
activity: "intro"
branch: "Sim Pay Branch a9as"
```

**Error:** `clickButton: no button matching "Mark PaySimStu1 as present" in snapshot`

### Step 3: `approve_pending_payment` as **ca**

```yaml
student: "PaySimStu1"
branch: "Sim Pay Branch a9as"
```

**Error:** `clickButton: no button matching "Approve payment for PaySimStu1" in snapshot`

## Fixtures

```json
{
  "runId": "a9assi",
  "branchId": "de388dd5-f41b-42d0-b493-3052f0436c67",
  "branchName": "__sim_a9assi_Sim Pay Branch",
  "courseId": "6c1ccb50-9d71-4640-874f-ed4e7eb8f136",
  "courseName": "__sim_a9assi_PayPython",
  "packageId": "79f9dcdd-9f45-4a35-8d8a-b3ce71a961f7",
  "users": [
    {
      "handle": "aa",
      "role": "assistant_admin",
      "id": "7f74552d-6d3b-490b-a4a5-dbfaa5dcd879",
      "email": "__sim_a9assi_aa@sim.local",
      "profile": "lms-sim-a9assi-aa",
      "password": "simpass"
    },
    {
      "handle": "inst",
      "role": "instructor",
      "id": "b978eea9-8b6b-4283-95ba-137b1edcd438",
      "email": "__sim_a9assi_inst@sim.local",
      "profile": "lms-sim-a9assi-inst",
      "password": "simpass"
    },
    {
      "handle": "ca",
      "role": "company_admin",
      "id": "09937079-3fab-4a86-ae05-d604f5c83eac",
      "email": "__sim_a9assi_ca@sim.local",
      "profile": "lms-sim-a9assi-ca",
      "password": "simpass"
    }
  ],
  "createdVoucherCodes": [],
  "branchCity": "Sim Pay Branch a9as"
}
```