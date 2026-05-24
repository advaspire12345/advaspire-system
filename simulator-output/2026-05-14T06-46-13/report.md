# Simulator report — student-payment-then-sessions-update

**Run dir:** /Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T06-46-13
**Steps:** 4
**Drift findings:** 2

## ❌ Drift / failure findings

| Step | Role | Field | DOM | DB | Expected | Result |
|------|------|-------|-----|-----|----------|--------|
| 3 | instructor | `/attendance.row_visible(PaySimStu1)` | false | — | true | ❌ DRIFT (DOM != expected) |
| 4 | instructor | `/attendance.row_visible(PaySimStu1)` | false | — | true | ❌ DRIFT (DOM != expected) |

## Full checkpoint table

| Step | Role | Field | DOM | DB | Expected | Result |
|------|------|-------|-----|-----|----------|--------|
| 1 | instructor | `/attendance.row_visible(PaySimStu1)` | true | — | true | ✅ |
| 1 | instructor | `student_table.period_active` | — | 0 | 0 | ✅ |
| 1 | instructor | `pending_payments_table.row_visible` | — | true | true | ✅ |
| 1 | company_admin | `/student.row_visible(PaySimStu1)` | true | — | true | ✅ |
| 1 | company_admin | `student_table.period_active` | — | 0 | 0 | ✅ |
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
| 3 | instructor | `/attendance.row_visible(PaySimStu1)` | false | — | true | ❌ DRIFT (DOM != expected) |
| 4 | assistant_admin | `/student.row_visible(PaySimStu1)` | true | — | true | ✅ |
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
course: "__sim_wbgoel_PayPython"
package: "12-session"
date_of_birth: "2015-01-01"
gender: "male"
school_name: "Sim School"
branch: "Sim Pay Branch wbgo"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T06-46-13/screenshots/1-actor-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T06-46-13/screenshots/1-observer-inst.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T06-46-13/screenshots/1-observer-ca.png`

### Step 2: `mark_present` as **inst**

```yaml
student: "PaySimStu1"
lesson: "Lesson 1"
mission: "Level 1"
activity: "intro"
branch: "Sim Pay Branch wbgo"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T06-46-13/screenshots/2-actor-inst.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T06-46-13/screenshots/2-observer-aa.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T06-46-13/screenshots/2-observer-ca.png`

### Step 3: `mark_offline_paid` as **ca**

```yaml
student: "PaySimStu1"
branch: "Sim Pay Branch wbgo"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T06-46-13/screenshots/3-actor-ca.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T06-46-13/screenshots/3-observer-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T06-46-13/screenshots/3-observer-inst.png`

### Step 4: `approve_pending_payment` as **ca**

```yaml
student: "PaySimStu1"
branch: "Sim Pay Branch wbgo"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T06-46-13/screenshots/4-actor-ca.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T06-46-13/screenshots/4-observer-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T06-46-13/screenshots/4-observer-inst.png`

## Fixtures

```json
{
  "runId": "wbgoel",
  "branchId": "2e77ee05-0ee2-48c0-a065-dd3e1b24485c",
  "branchName": "__sim_wbgoel_Sim Pay Branch",
  "courseId": "be89f21c-74e6-48a7-9967-fe305eeda18d",
  "courseName": "__sim_wbgoel_PayPython",
  "packageId": "888acea7-8205-41f1-a456-1d854ea1f302",
  "users": [
    {
      "handle": "aa",
      "role": "assistant_admin",
      "id": "14f3801d-28e7-4e5f-a39d-336ac4c1bbdd",
      "email": "__sim_wbgoel_aa@sim.local",
      "profile": "lms-sim-wbgoel-aa",
      "password": "simpass"
    },
    {
      "handle": "inst",
      "role": "instructor",
      "id": "0a16e873-e06a-4748-b2e2-70c1588ede80",
      "email": "__sim_wbgoel_inst@sim.local",
      "profile": "lms-sim-wbgoel-inst",
      "password": "simpass"
    },
    {
      "handle": "ca",
      "role": "company_admin",
      "id": "ba65ad49-0e7b-469c-8b6f-23eff1732918",
      "email": "__sim_wbgoel_ca@sim.local",
      "profile": "lms-sim-wbgoel-ca",
      "password": "simpass"
    }
  ],
  "createdVoucherCodes": [],
  "branchCity": "Sim Pay Branch wbgo"
}
```