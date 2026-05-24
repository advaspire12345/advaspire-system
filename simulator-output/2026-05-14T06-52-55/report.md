# Simulator report — student-payment-then-sessions-update

**Run dir:** /Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T06-52-55
**Steps:** 4
**Drift findings:** 1

## ❌ Drift / failure findings

| Step | Role | Field | DOM | DB | Expected | Result |
|------|------|-------|-----|-----|----------|--------|
| 1 | company_admin | `student_table.period_active` | — | null | 0 | ❌ DB_FAIL |

## Full checkpoint table

| Step | Role | Field | DOM | DB | Expected | Result |
|------|------|-------|-----|-----|----------|--------|
| 1 | instructor | `/attendance.row_visible(PaySimStu1)` | true | — | true | ✅ |
| 1 | instructor | `student_table.period_active` | — | 0 | 0 | ✅ |
| 1 | instructor | `pending_payments_table.row_visible` | — | true | true | ✅ |
| 1 | company_admin | `/student.row_visible(PaySimStu1)` | true | — | true | ✅ |
| 1 | company_admin | `student_table.period_active` | — | null | 0 | ❌ DB_FAIL |
| 1 | company_admin | `pending_payments_table.row_visible` | — | true | true | ✅ |
| 2 | assistant_admin | `/student.row_visible(PaySimStu1)` | true | — | true | ✅ |
| 2 | assistant_admin | `attendance_table.sessions_remaining` | — | -1 | -1 | ✅ |
| 2 | assistant_admin | `mark_present_modal.sessions_remaining` | — | -1 | -1 | ✅ |
| 2 | assistant_admin | `student_table.period_active` | — | -1 | -1 | ✅ |
| 2 | company_admin | `/student.row_visible(PaySimStu1)` | true | — | true | ✅ |
| 2 | company_admin | `attendance_table.sessions_remaining` | — | -1 | -1 | ✅ |
| 2 | company_admin | `mark_present_modal.sessions_remaining` | — | -1 | -1 | ✅ |
| 2 | company_admin | `student_table.period_active` | — | -1 | -1 | ✅ |
| 3 | assistant_admin | `/student.row_visible(PaySimStu1)` | true | — | true | ✅ |
| 3 | instructor | `/attendance.row_visible(PaySimStu1)` | false | — | false | ✅ |
| 4 | assistant_admin | `/student.row_visible(PaySimStu1)` | true | — | true | ✅ |
| 4 | assistant_admin | `student_table.period_active` | — | 11 | 11 | ✅ |
| 4 | assistant_admin | `attendance_table.sessions_remaining` | — | 11 | 11 | ✅ |
| 4 | assistant_admin | `mark_present_modal.sessions_remaining` | — | 11 | 11 | ✅ |
| 4 | assistant_admin | `student_table.payment_settled` | — | 600 | 600 | ✅ |
| 4 | instructor | `/attendance.row_visible(PaySimStu1)` | false | — | false | ✅ |
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
course: "__sim_pejvj8_PayPython"
package: "12-session"
date_of_birth: "2015-01-01"
gender: "male"
school_name: "Sim School"
branch: "Sim Pay Branch pejv"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T06-52-55/screenshots/1-actor-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T06-52-55/screenshots/1-observer-inst.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T06-52-55/screenshots/1-observer-ca.png`

### Step 2: `mark_present` as **inst**

```yaml
student: "PaySimStu1"
lesson: "Lesson 1"
mission: "Level 1"
activity: "intro"
branch: "Sim Pay Branch pejv"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T06-52-55/screenshots/2-actor-inst.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T06-52-55/screenshots/2-observer-aa.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T06-52-55/screenshots/2-observer-ca.png`

### Step 3: `mark_offline_paid` as **ca**

```yaml
student: "PaySimStu1"
branch: "Sim Pay Branch pejv"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T06-52-55/screenshots/3-actor-ca.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T06-52-55/screenshots/3-observer-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T06-52-55/screenshots/3-observer-inst.png`

### Step 4: `approve_pending_payment` as **ca**

```yaml
student: "PaySimStu1"
branch: "Sim Pay Branch pejv"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T06-52-55/screenshots/4-actor-ca.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T06-52-55/screenshots/4-observer-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T06-52-55/screenshots/4-observer-inst.png`

## Fixtures

```json
{
  "runId": "pejvj8",
  "branchId": "36e84f63-8fa7-45f8-b887-7dbebbe51baf",
  "branchName": "__sim_pejvj8_Sim Pay Branch",
  "courseId": "a633d58c-6265-4158-9d5f-9fe96e064d8c",
  "courseName": "__sim_pejvj8_PayPython",
  "packageId": "cdf1d7da-00af-4931-8948-a1c2b7e85f64",
  "users": [
    {
      "handle": "aa",
      "role": "assistant_admin",
      "id": "13932049-95c1-4d8b-a527-8864b3eb3bcf",
      "email": "__sim_pejvj8_aa@sim.local",
      "profile": "lms-sim-pejvj8-aa",
      "password": "simpass"
    },
    {
      "handle": "inst",
      "role": "instructor",
      "id": "33ae78ce-db11-4da9-9ea2-c2d27a48037a",
      "email": "__sim_pejvj8_inst@sim.local",
      "profile": "lms-sim-pejvj8-inst",
      "password": "simpass"
    },
    {
      "handle": "ca",
      "role": "company_admin",
      "id": "4bcbc14a-e8ac-428a-a571-5082beef9abf",
      "email": "__sim_pejvj8_ca@sim.local",
      "profile": "lms-sim-pejvj8-ca",
      "password": "simpass"
    }
  ],
  "createdVoucherCodes": [],
  "branchCity": "Sim Pay Branch pejv"
}
```