# Simulator report — student-payment-then-sessions-update

**Run dir:** /Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-13T12-39-44
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
course: "__sim_ji9cbn_PayPython"
package: "12-session"
date_of_birth: "2015-01-01"
gender: "male"
school_name: "Sim School"
branch: "Sim Pay Branch ji9c"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-13T12-39-44/screenshots/1-actor-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-13T12-39-44/screenshots/1-observer-inst.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-13T12-39-44/screenshots/1-observer-ca.png`

### Step 2: `mark_present` as **inst**

```yaml
student: "PaySimStu1"
lesson: "Lesson 1"
mission: "Level 1"
activity: "intro"
branch: "Sim Pay Branch ji9c"
```

**Error:** `selectByLabel: no option "Lesson 1" after opening "Lesson"`

### Step 3: `approve_pending_payment` as **ca**

```yaml
student: "PaySimStu1"
branch: "Sim Pay Branch ji9c"
```

**Error:** `clickButton: no button matching "Approve payment for PaySimStu1" in snapshot`

## Fixtures

```json
{
  "runId": "ji9cbn",
  "branchId": "98282826-88e5-4b9b-ba56-6b327c1c39ac",
  "branchName": "__sim_ji9cbn_Sim Pay Branch",
  "courseId": "dea20979-9134-40ab-b090-50fee222669e",
  "courseName": "__sim_ji9cbn_PayPython",
  "packageId": "202e7c02-92c8-4c59-81b4-b6974c04ee78",
  "users": [
    {
      "handle": "aa",
      "role": "assistant_admin",
      "id": "cf49a9c3-1784-47aa-9743-d7047bdd9d59",
      "email": "__sim_ji9cbn_aa@sim.local",
      "profile": "lms-sim-ji9cbn-aa",
      "password": "simpass"
    },
    {
      "handle": "inst",
      "role": "instructor",
      "id": "391b041c-1e4e-4ae4-9ed1-145dabd604e9",
      "email": "__sim_ji9cbn_inst@sim.local",
      "profile": "lms-sim-ji9cbn-inst",
      "password": "simpass"
    },
    {
      "handle": "ca",
      "role": "company_admin",
      "id": "a7428949-ae50-4253-a045-be873e4fe3d6",
      "email": "__sim_ji9cbn_ca@sim.local",
      "profile": "lms-sim-ji9cbn-ca",
      "password": "simpass"
    }
  ],
  "createdVoucherCodes": [],
  "branchCity": "Sim Pay Branch ji9c"
}
```