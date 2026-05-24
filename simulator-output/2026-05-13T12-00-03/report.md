# Simulator report — student-payment-then-sessions-update

**Run dir:** /Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-13T12-00-03
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
course: "__sim_lz9fv1_PayPython"
package: "12-session"
date_of_birth: "2015-01-01"
gender: "male"
school_name: "Sim School"
branch: "Sim Pay Branch lz9f"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-13T12-00-03/screenshots/1-actor-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-13T12-00-03/screenshots/1-observer-inst.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-13T12-00-03/screenshots/1-observer-ca.png`

### Step 2: `mark_present` as **inst**

```yaml
student: "PaySimStu1"
lesson: "Lesson 1"
mission: "Level 1"
activity: "intro"
branch: "Sim Pay Branch lz9f"
```

**Error:** `clickButton: no button matching "Mark PaySimStu1 as present" in snapshot`

### Step 3: `approve_pending_payment` as **ca**

```yaml
student: "PaySimStu1"
branch: "Sim Pay Branch lz9f"
```

**Error:** `clickButton: no button matching "Approve payment for PaySimStu1" in snapshot`

## Fixtures

```json
{
  "runId": "lz9fv1",
  "branchId": "81de501e-8cd2-4869-8c19-52d4886769c1",
  "branchName": "__sim_lz9fv1_Sim Pay Branch",
  "courseId": "e7699142-f4f5-4231-b564-80ebbeaf6f27",
  "courseName": "__sim_lz9fv1_PayPython",
  "packageId": "6bf0dc51-e160-4a0a-83b9-f9f72ad930e4",
  "users": [
    {
      "handle": "aa",
      "role": "assistant_admin",
      "id": "84b89340-8c31-417b-bc4a-ce20ee94632f",
      "email": "__sim_lz9fv1_aa@sim.local",
      "profile": "lms-sim-lz9fv1-aa",
      "password": "simpass"
    },
    {
      "handle": "inst",
      "role": "instructor",
      "id": "ec45a22e-f3a6-4f77-8aae-7c0ad0d1b97c",
      "email": "__sim_lz9fv1_inst@sim.local",
      "profile": "lms-sim-lz9fv1-inst",
      "password": "simpass"
    },
    {
      "handle": "ca",
      "role": "company_admin",
      "id": "fd8ade81-0760-4ea8-9ebe-68b791c8067e",
      "email": "__sim_lz9fv1_ca@sim.local",
      "profile": "lms-sim-lz9fv1-ca",
      "password": "simpass"
    }
  ],
  "createdVoucherCodes": [],
  "branchCity": "Sim Pay Branch lz9f"
}
```