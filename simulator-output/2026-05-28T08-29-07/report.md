# Simulator report — examination-auto-levelup-tolerance

**Run dir:** /Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-28T08-29-07
**Steps:** 4
**Drift findings:** 0

✅ All checkpoints passed.

## Full checkpoint table

| Step | Role | Field | DOM | DB | Expected | Result |
|------|------|-------|-----|-----|----------|--------|
| 1 | instructor | `/attendance.row_visible(Aiman)` | true | — | true | ✅ |
| 1 | company_admin | `/student.row_visible(Aiman)` | true | — | true | ✅ |
| 2 | assistant_admin | `/student.row_visible(Aiman)` | true | — | true | ✅ |
| 2 | instructor | `/attendance.row_visible(Aiman)` | true | — | true | ✅ |
| 3 | assistant_admin | `/student.row_visible(Aiman)` | true | — | true | ✅ |
| 3 | instructor | `/attendance.row_visible(Aiman)` | true | — | true | ✅ |
| 4 | assistant_admin | `/student.row_visible(Aiman)` | true | — | true | ✅ |
| 4 | company_admin | `/student.row_visible(Aiman)` | true | — | true | ✅ |

## Per-step breakdown

### Step 1: `add_student` as **aa**

```yaml
name: "Aiman"
parent_name: "Exam Parent"
parent_email: "examp@sim.local"
parent_phone: "0123450099"
course: "__sim_q0xxez_ExamCourse"
package: "4-session"
date_of_birth: "2015-01-01"
gender: "male"
school_name: "Sim School"
branch: "Sim Exam Branch q0xx"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-28T08-29-07/screenshots/1-actor-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-28T08-29-07/screenshots/1-observer-inst.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-28T08-29-07/screenshots/1-observer-ca.png`

### Step 2: `mark_offline_paid` as **ca**

```yaml
student: "Aiman"
branch: "Sim Exam Branch q0xx"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-28T08-29-07/screenshots/2-actor-ca.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-28T08-29-07/screenshots/2-observer-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-28T08-29-07/screenshots/2-observer-inst.png`

### Step 3: `approve_pending_payment` as **ca**

```yaml
student: "Aiman"
branch: "Sim Exam Branch q0xx"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-28T08-29-07/screenshots/3-actor-ca.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-28T08-29-07/screenshots/3-observer-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-28T08-29-07/screenshots/3-observer-inst.png`

### Step 4: `mark_present` as **inst**

```yaml
student: "Aiman"
lesson: "Lesson 1"
mission: "Level 1"
activity: "intro"
branch: "Sim Exam Branch q0xx"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-28T08-29-07/screenshots/4-actor-inst.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-28T08-29-07/screenshots/4-observer-aa.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-28T08-29-07/screenshots/4-observer-ca.png`

## Fixtures

```json
{
  "runId": "q0xxez",
  "branchId": "47e728a8-77ee-400b-893c-4b53adbe7df9",
  "branchName": "__sim_q0xxez_Sim Exam Branch",
  "courseId": "bf126dd1-7da6-4137-a4d6-aba8deda853e",
  "courseName": "__sim_q0xxez_ExamCourse",
  "packageId": "54c7b4c0-0dc2-4a21-bab0-b0548f4082dd",
  "users": [
    {
      "handle": "aa",
      "role": "assistant_admin",
      "id": "3b6e1b50-e7dd-404d-98cb-f6443bdb6ecc",
      "email": "__sim_q0xxez_aa@sim.local",
      "profile": "lms-sim-q0xxez-aa",
      "password": "simpass"
    },
    {
      "handle": "inst",
      "role": "instructor",
      "id": "6538c84f-8b22-4289-b9d9-77ccbd898de8",
      "email": "__sim_q0xxez_inst@sim.local",
      "profile": "lms-sim-q0xxez-inst",
      "password": "simpass"
    },
    {
      "handle": "ca",
      "role": "company_admin",
      "id": "eba4ee48-15bc-4792-91a1-9cc00c76e44d",
      "email": "__sim_q0xxez_ca@sim.local",
      "profile": "lms-sim-q0xxez-ca",
      "password": "simpass"
    }
  ],
  "createdVoucherCodes": [],
  "branchCity": "Sim Exam Branch q0xx"
}
```