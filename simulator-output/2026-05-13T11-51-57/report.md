# Simulator report — student-payment-then-sessions-update

**Run dir:** /Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-13T11-51-57
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
course: "__sim_349v1b_PayPython"
package: "12-session"
date_of_birth: "2015-01-01"
gender: "male"
school_name: "Sim School"
branch: "Sim Pay Branch 349v"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-13T11-51-57/screenshots/1-actor-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-13T11-51-57/screenshots/1-observer-inst.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-13T11-51-57/screenshots/1-observer-ca.png`

### Step 2: `mark_present` as **inst**

```yaml
student: "PaySimStu1"
lesson: "Lesson 1"
mission: "Level 1"
activity: "intro"
branch: "Sim Pay Branch 349v"
```

**Error:** `clickButton: no button matching "Mark PaySimStu1 as present" in snapshot`

### Step 3: `approve_pending_payment` as **ca**

```yaml
student: "PaySimStu1"
branch: "Sim Pay Branch 349v"
```

**Error:** `clickButton: no button matching "Approve payment for PaySimStu1" in snapshot`

## Fixtures

```json
{
  "runId": "349v1b",
  "branchId": "9301b20c-ff7e-49d1-904e-ebd84821d137",
  "branchName": "__sim_349v1b_Sim Pay Branch",
  "courseId": "e748ea7d-7b19-45a0-8416-fa321400bc7c",
  "courseName": "__sim_349v1b_PayPython",
  "packageId": "8171c1a6-5307-40ab-9bde-0f85528e6d31",
  "users": [
    {
      "handle": "aa",
      "role": "assistant_admin",
      "id": "eaab8422-4479-420f-853b-6cb878b68621",
      "email": "__sim_349v1b_aa@sim.local",
      "profile": "lms-sim-349v1b-aa",
      "password": "simpass"
    },
    {
      "handle": "inst",
      "role": "instructor",
      "id": "46eb13a6-59e5-40ce-b435-ec9e6123a5f4",
      "email": "__sim_349v1b_inst@sim.local",
      "profile": "lms-sim-349v1b-inst",
      "password": "simpass"
    },
    {
      "handle": "ca",
      "role": "company_admin",
      "id": "81b54d12-e18e-4ed4-97cf-21a33db43424",
      "email": "__sim_349v1b_ca@sim.local",
      "profile": "lms-sim-349v1b-ca",
      "password": "simpass"
    }
  ],
  "createdVoucherCodes": [],
  "branchCity": "Sim Pay Branch 349v"
}
```