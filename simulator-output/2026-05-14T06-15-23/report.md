# Simulator report — student-payment-then-sessions-update

**Run dir:** /Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T06-15-23
**Steps:** 4
**Drift findings:** 8

## ❌ Drift / failure findings

| Step | Role | Field | DOM | DB | Expected | Result |
|------|------|-------|-----|-----|----------|--------|
| 1 | instructor | `/attendance.row_visible(PaySimStu1)` | false | — | true | ❌ DRIFT (DOM != expected) |
| 1 | company_admin | `/student.row_visible(PaySimStu1)` | false | — | true | ❌ DRIFT (DOM != expected) |
| 2 | assistant_admin | `/student.row_visible(PaySimStu1)` | false | — | true | ❌ DRIFT (DOM != expected) |
| 2 | company_admin | `/student.row_visible(PaySimStu1)` | false | — | true | ❌ DRIFT (DOM != expected) |
| 3 | assistant_admin | `/student.row_visible(PaySimStu1)` | false | — | true | ❌ DRIFT (DOM != expected) |
| 3 | instructor | `/attendance.row_visible(PaySimStu1)` | false | — | true | ❌ DRIFT (DOM != expected) |
| 4 | assistant_admin | `/student.row_visible(PaySimStu1)` | false | — | true | ❌ DRIFT (DOM != expected) |
| 4 | instructor | `/attendance.row_visible(PaySimStu1)` | false | — | true | ❌ DRIFT (DOM != expected) |

## Full checkpoint table

| Step | Role | Field | DOM | DB | Expected | Result |
|------|------|-------|-----|-----|----------|--------|
| 1 | instructor | `/attendance.row_visible(PaySimStu1)` | false | — | true | ❌ DRIFT (DOM != expected) |
| 1 | instructor | `student_table.period_active` | — | 0 | 0 | ✅ |
| 1 | instructor | `pending_payments_table.row_visible` | — | true | true | ✅ |
| 1 | company_admin | `/student.row_visible(PaySimStu1)` | false | — | true | ❌ DRIFT (DOM != expected) |
| 1 | company_admin | `student_table.period_active` | — | 0 | 0 | ✅ |
| 1 | company_admin | `pending_payments_table.row_visible` | — | true | true | ✅ |
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
| 4 | assistant_admin | `student_table.payment_settled` | — | 600 | 600 | ✅ |
| 4 | instructor | `/attendance.row_visible(PaySimStu1)` | false | — | true | ❌ DRIFT (DOM != expected) |
| 4 | instructor | `student_table.period_active` | — | 11 | 11 | ✅ |
| 4 | instructor | `attendance_table.sessions_remaining` | — | 11 | 11 | ✅ |
| 4 | instructor | `mark_present_modal.sessions_remaining` | — | 11 | 11 | ✅ |
| 4 | instructor | `student_table.payment_settled` | — | 600 | 600 | ✅ |

## Per-step breakdown

### Step 1: `add_student` as **aa**

```yaml
name: "PaySimStu1"
parent_name: "Pay Parent 1"
parent_email: "pp1@sim.local"
parent_phone: "0123456789"
course: "__sim_1p3hvq_PayPython"
package: "12-session"
date_of_birth: "2015-01-01"
gender: "male"
school_name: "Sim School"
branch: "Sim Pay Branch 1p3h"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T06-15-23/screenshots/1-actor-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T06-15-23/screenshots/1-observer-inst.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T06-15-23/screenshots/1-observer-ca.png`

### Step 2: `mark_present` as **inst**

```yaml
student: "PaySimStu1"
lesson: "Lesson 1"
mission: "Level 1"
activity: "intro"
branch: "Sim Pay Branch 1p3h"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T06-15-23/screenshots/2-actor-inst.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T06-15-23/screenshots/2-observer-aa.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T06-15-23/screenshots/2-observer-ca.png`

### Step 3: `mark_offline_paid` as **ca**

```yaml
student: "PaySimStu1"
branch: "Sim Pay Branch 1p3h"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T06-15-23/screenshots/3-actor-ca.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T06-15-23/screenshots/3-observer-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T06-15-23/screenshots/3-observer-inst.png`

### Step 4: `approve_pending_payment` as **ca**

```yaml
student: "PaySimStu1"
branch: "Sim Pay Branch 1p3h"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T06-15-23/screenshots/4-actor-ca.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T06-15-23/screenshots/4-observer-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T06-15-23/screenshots/4-observer-inst.png`

## Fixtures

```json
{
  "runId": "1p3hvq",
  "branchId": "de5ab579-888a-4ee6-888b-76d323ddd228",
  "branchName": "__sim_1p3hvq_Sim Pay Branch",
  "courseId": "f4fb6749-bd92-45d1-8909-276034047e86",
  "courseName": "__sim_1p3hvq_PayPython",
  "packageId": "63e8a519-76f2-42a1-8143-72f12447b656",
  "users": [
    {
      "handle": "aa",
      "role": "assistant_admin",
      "id": "5da9c7dd-fa14-4655-8abe-85b51505520c",
      "email": "__sim_1p3hvq_aa@sim.local",
      "profile": "lms-sim-1p3hvq-aa",
      "password": "simpass"
    },
    {
      "handle": "inst",
      "role": "instructor",
      "id": "e3c76637-0f06-414d-bce8-e52080041d90",
      "email": "__sim_1p3hvq_inst@sim.local",
      "profile": "lms-sim-1p3hvq-inst",
      "password": "simpass"
    },
    {
      "handle": "ca",
      "role": "company_admin",
      "id": "28094ef8-c847-40e4-ba68-db33e8ab82cd",
      "email": "__sim_1p3hvq_ca@sim.local",
      "profile": "lms-sim-1p3hvq-ca",
      "password": "simpass"
    }
  ],
  "createdVoucherCodes": [],
  "branchCity": "Sim Pay Branch 1p3h"
}
```