# Simulator report — student-payment-then-sessions-update

**Run dir:** /Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T05-15-43
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
| 2 | company_admin | `/student.row_visible(PaySimStu1)` | false | — | true | ❌ DRIFT (DOM != expected) |
| 3 | assistant_admin | `/student.row_visible(PaySimStu1)` | false | — | true | ❌ DRIFT (DOM != expected) |
| 3 | instructor | `/attendance.row_visible(PaySimStu1)` | false | — | true | ❌ DRIFT (DOM != expected) |
| 4 | assistant_admin | `/student.row_visible(PaySimStu1)` | false | — | true | ❌ DRIFT (DOM != expected) |
| 4 | assistant_admin | `student_table.payment_settled` | — | 11 | 600 | ❌ DB_FAIL |
| 4 | instructor | `/attendance.row_visible(PaySimStu1)` | false | — | true | ❌ DRIFT (DOM != expected) |
| 4 | instructor | `student_table.payment_settled` | — | 11 | 600 | ❌ DB_FAIL |

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
| 2 | assistant_admin | `attendance_table.sessions_remaining` | — | -1 | -1 | ✅ |
| 2 | assistant_admin | `mark_present_modal.sessions_remaining` | — | -1 | -1 | ✅ |
| 2 | assistant_admin | `student_table.period_active` | — | -1 | -1 | ✅ |
| 2 | company_admin | `/student.row_visible(PaySimStu1)` | false | — | true | ❌ DRIFT (DOM != expected) |
| 2 | company_admin | `attendance_table.sessions_remaining` | — | -1 | -1 | ✅ |
| 2 | company_admin | `mark_present_modal.sessions_remaining` | — | -1 | -1 | ✅ |
| 2 | company_admin | `student_table.period_active` | — | -1 | -1 | ✅ |
| 3 | assistant_admin | `/student.row_visible(PaySimStu1)` | false | — | true | ❌ DRIFT (DOM != expected) |
| 3 | instructor | `/attendance.row_visible(PaySimStu1)` | false | — | true | ❌ DRIFT (DOM != expected) |
| 4 | assistant_admin | `/student.row_visible(PaySimStu1)` | false | — | true | ❌ DRIFT (DOM != expected) |
| 4 | assistant_admin | `student_table.period_active` | — | 11 | 11 | ✅ |
| 4 | assistant_admin | `attendance_table.sessions_remaining` | — | 11 | 11 | ✅ |
| 4 | assistant_admin | `mark_present_modal.sessions_remaining` | — | 11 | 11 | ✅ |
| 4 | assistant_admin | `student_table.payment_settled` | — | 11 | 600 | ❌ DB_FAIL |
| 4 | instructor | `/attendance.row_visible(PaySimStu1)` | false | — | true | ❌ DRIFT (DOM != expected) |
| 4 | instructor | `student_table.period_active` | — | 11 | 11 | ✅ |
| 4 | instructor | `attendance_table.sessions_remaining` | — | 11 | 11 | ✅ |
| 4 | instructor | `mark_present_modal.sessions_remaining` | — | 11 | 11 | ✅ |
| 4 | instructor | `student_table.payment_settled` | — | 11 | 600 | ❌ DB_FAIL |

## Per-step breakdown

### Step 1: `add_student` as **aa**

```yaml
name: "PaySimStu1"
parent_name: "Pay Parent 1"
parent_email: "pp1@sim.local"
parent_phone: "0123456789"
course: "__sim_0x3i2p_PayPython"
package: "12-session"
date_of_birth: "2015-01-01"
gender: "male"
school_name: "Sim School"
branch: "Sim Pay Branch 0x3i"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T05-15-43/screenshots/1-actor-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T05-15-43/screenshots/1-observer-inst.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T05-15-43/screenshots/1-observer-ca.png`

### Step 2: `mark_present` as **inst**

```yaml
student: "PaySimStu1"
lesson: "Lesson 1"
mission: "Level 1"
activity: "intro"
branch: "Sim Pay Branch 0x3i"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T05-15-43/screenshots/2-actor-inst.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T05-15-43/screenshots/2-observer-aa.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T05-15-43/screenshots/2-observer-ca.png`

### Step 3: `mark_offline_paid` as **ca**

```yaml
student: "PaySimStu1"
branch: "Sim Pay Branch 0x3i"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T05-15-43/screenshots/3-actor-ca.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T05-15-43/screenshots/3-observer-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T05-15-43/screenshots/3-observer-inst.png`

### Step 4: `approve_pending_payment` as **ca**

```yaml
student: "PaySimStu1"
branch: "Sim Pay Branch 0x3i"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T05-15-43/screenshots/4-actor-ca.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T05-15-43/screenshots/4-observer-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T05-15-43/screenshots/4-observer-inst.png`

## Fixtures

```json
{
  "runId": "0x3i2p",
  "branchId": "092cd190-aadb-443b-bb27-998d086fa324",
  "branchName": "__sim_0x3i2p_Sim Pay Branch",
  "courseId": "54127182-c2fc-4e07-8481-4963d6a36097",
  "courseName": "__sim_0x3i2p_PayPython",
  "packageId": "7748d497-0e61-4b44-b9cb-b98f8b23e183",
  "users": [
    {
      "handle": "aa",
      "role": "assistant_admin",
      "id": "47d00361-dedc-4276-b387-237458399ecb",
      "email": "__sim_0x3i2p_aa@sim.local",
      "profile": "lms-sim-0x3i2p-aa",
      "password": "simpass"
    },
    {
      "handle": "inst",
      "role": "instructor",
      "id": "66e4474b-eb3b-4e21-87f3-30153160680a",
      "email": "__sim_0x3i2p_inst@sim.local",
      "profile": "lms-sim-0x3i2p-inst",
      "password": "simpass"
    },
    {
      "handle": "ca",
      "role": "company_admin",
      "id": "84b26de3-82fc-4929-96c6-a08d3a95b98a",
      "email": "__sim_0x3i2p_ca@sim.local",
      "profile": "lms-sim-0x3i2p-ca",
      "password": "simpass"
    }
  ],
  "createdVoucherCodes": [],
  "branchCity": "Sim Pay Branch 0x3i"
}
```