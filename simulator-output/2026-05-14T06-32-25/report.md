# Simulator report — student-payment-then-sessions-update

**Run dir:** /Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T06-32-25
**Steps:** 4
**Drift findings:** 8

## ❌ Drift / failure findings

| Step | Role | Field | DOM | DB | Expected | Result |
|------|------|-------|-----|-----|----------|--------|
| 1 | instructor | `attendance_table.sessions_remaining` | null | 0 | 0 | ❌ DRIFT (DOM != expected) |
| 1 | company_admin | `student_table.period_active` | null | 0 | 0 | ❌ DRIFT (DOM != expected) |
| 2 | assistant_admin | `student_table.period_active` | null | -1 | -1 | ❌ DRIFT (DOM != expected) |
| 2 | company_admin | `student_table.period_active` | null | -1 | -1 | ❌ DRIFT (DOM != expected) |
| 3 | assistant_admin | `student_table.period_active` | null | -1 | -1 | ❌ DRIFT (DOM != expected) |
| 3 | instructor | `/attendance.row_visible(PaySimStu1)` | false | — | true | ❌ DRIFT (DOM != expected) |
| 4 | assistant_admin | `student_table.period_active` | null | 11 | 11 | ❌ DRIFT (DOM != expected) |
| 4 | instructor | `/attendance.row_visible(PaySimStu1)` | false | — | true | ❌ DRIFT (DOM != expected) |

## Full checkpoint table

| Step | Role | Field | DOM | DB | Expected | Result |
|------|------|-------|-----|-----|----------|--------|
| 1 | instructor | `/attendance.row_visible(PaySimStu1)` | true | — | true | ✅ |
| 1 | instructor | `attendance_table.sessions_remaining` | null | 0 | 0 | ❌ DRIFT (DOM != expected) |
| 1 | instructor | `student_table.period_active` | — | 0 | 0 | ✅ |
| 1 | instructor | `pending_payments_table.row_visible` | — | true | true | ✅ |
| 1 | company_admin | `/student.row_visible(PaySimStu1)` | true | — | true | ✅ |
| 1 | company_admin | `student_table.period_active` | null | 0 | 0 | ❌ DRIFT (DOM != expected) |
| 1 | company_admin | `student_table.period_active` | — | 0 | 0 | ✅ |
| 1 | company_admin | `pending_payments_table.row_visible` | — | true | true | ✅ |
| 2 | assistant_admin | `/student.row_visible(PaySimStu1)` | true | — | true | ✅ |
| 2 | assistant_admin | `student_table.period_active` | null | -1 | -1 | ❌ DRIFT (DOM != expected) |
| 2 | assistant_admin | `attendance_table.sessions_remaining` | — | -1 | -1 | ✅ |
| 2 | assistant_admin | `mark_present_modal.sessions_remaining` | — | -1 | -1 | ✅ |
| 2 | assistant_admin | `student_table.period_active` | — | -1 | -1 | ✅ |
| 2 | company_admin | `/student.row_visible(PaySimStu1)` | true | — | true | ✅ |
| 2 | company_admin | `student_table.period_active` | null | -1 | -1 | ❌ DRIFT (DOM != expected) |
| 2 | company_admin | `attendance_table.sessions_remaining` | — | -1 | -1 | ✅ |
| 2 | company_admin | `mark_present_modal.sessions_remaining` | — | -1 | -1 | ✅ |
| 2 | company_admin | `student_table.period_active` | — | -1 | -1 | ✅ |
| 3 | assistant_admin | `/student.row_visible(PaySimStu1)` | true | — | true | ✅ |
| 3 | assistant_admin | `student_table.period_active` | null | -1 | -1 | ❌ DRIFT (DOM != expected) |
| 3 | instructor | `/attendance.row_visible(PaySimStu1)` | false | — | true | ❌ DRIFT (DOM != expected) |
| 4 | assistant_admin | `/student.row_visible(PaySimStu1)` | true | — | true | ✅ |
| 4 | assistant_admin | `student_table.period_active` | null | 11 | 11 | ❌ DRIFT (DOM != expected) |
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
course: "__sim_w22sui_PayPython"
package: "12-session"
date_of_birth: "2015-01-01"
gender: "male"
school_name: "Sim School"
branch: "Sim Pay Branch w22s"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T06-32-25/screenshots/1-actor-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T06-32-25/screenshots/1-observer-inst.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T06-32-25/screenshots/1-observer-ca.png`

### Step 2: `mark_present` as **inst**

```yaml
student: "PaySimStu1"
lesson: "Lesson 1"
mission: "Level 1"
activity: "intro"
branch: "Sim Pay Branch w22s"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T06-32-25/screenshots/2-actor-inst.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T06-32-25/screenshots/2-observer-aa.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T06-32-25/screenshots/2-observer-ca.png`

### Step 3: `mark_offline_paid` as **ca**

```yaml
student: "PaySimStu1"
branch: "Sim Pay Branch w22s"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T06-32-25/screenshots/3-actor-ca.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T06-32-25/screenshots/3-observer-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T06-32-25/screenshots/3-observer-inst.png`

### Step 4: `approve_pending_payment` as **ca**

```yaml
student: "PaySimStu1"
branch: "Sim Pay Branch w22s"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T06-32-25/screenshots/4-actor-ca.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T06-32-25/screenshots/4-observer-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T06-32-25/screenshots/4-observer-inst.png`

## Fixtures

```json
{
  "runId": "w22sui",
  "branchId": "9939f970-6b50-4a26-9cf6-6ad27e159ec7",
  "branchName": "__sim_w22sui_Sim Pay Branch",
  "courseId": "146a6c81-bb62-453b-900e-c6bf390d7ed9",
  "courseName": "__sim_w22sui_PayPython",
  "packageId": "d8021e36-2203-4418-bcb8-3ba2d6ea594f",
  "users": [
    {
      "handle": "aa",
      "role": "assistant_admin",
      "id": "e42964b1-a3f2-4a16-9904-12475d195533",
      "email": "__sim_w22sui_aa@sim.local",
      "profile": "lms-sim-w22sui-aa",
      "password": "simpass"
    },
    {
      "handle": "inst",
      "role": "instructor",
      "id": "0244ef07-f9f3-4d41-9f6b-2722064e28b1",
      "email": "__sim_w22sui_inst@sim.local",
      "profile": "lms-sim-w22sui-inst",
      "password": "simpass"
    },
    {
      "handle": "ca",
      "role": "company_admin",
      "id": "a74e3818-5801-4ce7-a0b6-47ae8132ac3c",
      "email": "__sim_w22sui_ca@sim.local",
      "profile": "lms-sim-w22sui-ca",
      "password": "simpass"
    }
  ],
  "createdVoucherCodes": [],
  "branchCity": "Sim Pay Branch w22s"
}
```