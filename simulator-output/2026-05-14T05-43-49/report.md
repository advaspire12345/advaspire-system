# Simulator report — student-payment-then-sessions-update

**Run dir:** /Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T05-43-49
**Steps:** 4
**Drift findings:** 16

## ❌ Drift / failure findings

| Step | Role | Field | DOM | DB | Expected | Result |
|------|------|-------|-----|-----|----------|--------|
| 1 | instructor | `/attendance.row_visible(PaySimStu1)` | false | — | true | ❌ DRIFT (DOM != expected) |
| 1 | instructor | `student_table.period_active` | — | 11 | 0 | ❌ DB_FAIL |
| 1 | company_admin | `/student.row_visible(PaySimStu1)` | false | — | true | ❌ DRIFT (DOM != expected) |
| 1 | company_admin | `student_table.period_active` | — | 11 | 0 | ❌ DB_FAIL |
| 2 | assistant_admin | `/student.row_visible(PaySimStu1)` | false | — | true | ❌ DRIFT (DOM != expected) |
| 2 | assistant_admin | `attendance_table.sessions_remaining` | — | 11 | -1 | ❌ DB_FAIL |
| 2 | assistant_admin | `mark_present_modal.sessions_remaining` | — | 11 | -1 | ❌ DB_FAIL |
| 2 | assistant_admin | `student_table.period_active` | — | 11 | -1 | ❌ DB_FAIL |
| 2 | company_admin | `/student.row_visible(PaySimStu1)` | false | — | true | ❌ DRIFT (DOM != expected) |
| 2 | company_admin | `attendance_table.sessions_remaining` | — | 11 | -1 | ❌ DB_FAIL |
| 2 | company_admin | `mark_present_modal.sessions_remaining` | — | 11 | -1 | ❌ DB_FAIL |
| 2 | company_admin | `student_table.period_active` | — | 11 | -1 | ❌ DB_FAIL |
| 3 | assistant_admin | `/student.row_visible(PaySimStu1)` | false | — | true | ❌ DRIFT (DOM != expected) |
| 3 | instructor | `/attendance.row_visible(PaySimStu1)` | false | — | true | ❌ DRIFT (DOM != expected) |
| 4 | assistant_admin | `/student.row_visible(PaySimStu1)` | false | — | true | ❌ DRIFT (DOM != expected) |
| 4 | instructor | `/attendance.row_visible(PaySimStu1)` | false | — | true | ❌ DRIFT (DOM != expected) |

## Full checkpoint table

| Step | Role | Field | DOM | DB | Expected | Result |
|------|------|-------|-----|-----|----------|--------|
| 1 | instructor | `/attendance.row_visible(PaySimStu1)` | false | — | true | ❌ DRIFT (DOM != expected) |
| 1 | instructor | `student_table.period_active` | — | 11 | 0 | ❌ DB_FAIL |
| 1 | instructor | `pending_payments_table.row_visible` | — | true | true | ✅ |
| 1 | company_admin | `/student.row_visible(PaySimStu1)` | false | — | true | ❌ DRIFT (DOM != expected) |
| 1 | company_admin | `student_table.period_active` | — | 11 | 0 | ❌ DB_FAIL |
| 1 | company_admin | `pending_payments_table.row_visible` | — | true | true | ✅ |
| 2 | assistant_admin | `/student.row_visible(PaySimStu1)` | false | — | true | ❌ DRIFT (DOM != expected) |
| 2 | assistant_admin | `attendance_table.sessions_remaining` | — | 11 | -1 | ❌ DB_FAIL |
| 2 | assistant_admin | `mark_present_modal.sessions_remaining` | — | 11 | -1 | ❌ DB_FAIL |
| 2 | assistant_admin | `student_table.period_active` | — | 11 | -1 | ❌ DB_FAIL |
| 2 | company_admin | `/student.row_visible(PaySimStu1)` | false | — | true | ❌ DRIFT (DOM != expected) |
| 2 | company_admin | `attendance_table.sessions_remaining` | — | 11 | -1 | ❌ DB_FAIL |
| 2 | company_admin | `mark_present_modal.sessions_remaining` | — | 11 | -1 | ❌ DB_FAIL |
| 2 | company_admin | `student_table.period_active` | — | 11 | -1 | ❌ DB_FAIL |
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
course: "__sim_nft5h3_PayPython"
package: "12-session"
date_of_birth: "2015-01-01"
gender: "male"
school_name: "Sim School"
branch: "Sim Pay Branch nft5"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T05-43-49/screenshots/1-actor-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T05-43-49/screenshots/1-observer-inst.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T05-43-49/screenshots/1-observer-ca.png`

### Step 2: `mark_present` as **inst**

```yaml
student: "PaySimStu1"
lesson: "Lesson 1"
mission: "Level 1"
activity: "intro"
branch: "Sim Pay Branch nft5"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T05-43-49/screenshots/2-actor-inst.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T05-43-49/screenshots/2-observer-aa.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T05-43-49/screenshots/2-observer-ca.png`

### Step 3: `mark_offline_paid` as **ca**

```yaml
student: "PaySimStu1"
branch: "Sim Pay Branch nft5"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T05-43-49/screenshots/3-actor-ca.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T05-43-49/screenshots/3-observer-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T05-43-49/screenshots/3-observer-inst.png`

### Step 4: `approve_pending_payment` as **ca**

```yaml
student: "PaySimStu1"
branch: "Sim Pay Branch nft5"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T05-43-49/screenshots/4-actor-ca.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T05-43-49/screenshots/4-observer-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T05-43-49/screenshots/4-observer-inst.png`

## Fixtures

```json
{
  "runId": "nft5h3",
  "branchId": "cebe9599-ebbc-46c4-912e-ea9be276a25f",
  "branchName": "__sim_nft5h3_Sim Pay Branch",
  "courseId": "68eeb91d-38f9-4c64-b11f-b41a181cfc7c",
  "courseName": "__sim_nft5h3_PayPython",
  "packageId": "ed8f9431-a174-4cd4-b2d0-647aaf8872b6",
  "users": [
    {
      "handle": "aa",
      "role": "assistant_admin",
      "id": "3f1e0f10-22a2-4cbb-b09c-1d05d287fa15",
      "email": "__sim_nft5h3_aa@sim.local",
      "profile": "lms-sim-nft5h3-aa",
      "password": "simpass"
    },
    {
      "handle": "inst",
      "role": "instructor",
      "id": "8ad17bdd-5adc-4faa-9b8e-2bb5eff2e53f",
      "email": "__sim_nft5h3_inst@sim.local",
      "profile": "lms-sim-nft5h3-inst",
      "password": "simpass"
    },
    {
      "handle": "ca",
      "role": "company_admin",
      "id": "84971f4a-ec0b-4b48-82a9-ada0c2446232",
      "email": "__sim_nft5h3_ca@sim.local",
      "profile": "lms-sim-nft5h3-ca",
      "password": "simpass"
    }
  ],
  "createdVoucherCodes": [],
  "branchCity": "Sim Pay Branch nft5"
}
```