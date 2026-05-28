# Simulator report — examination-auto-levelup-tolerance

**Run dir:** /Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-28T08-53-35
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
course: "__sim_dxpf3s_ExamCourse"
package: "4-session"
date_of_birth: "2015-01-01"
gender: "male"
school_name: "Sim School"
branch: "Sim Exam Branch dxpf"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-28T08-53-35/screenshots/1-actor-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-28T08-53-35/screenshots/1-observer-inst.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-28T08-53-35/screenshots/1-observer-ca.png`

### Step 2: `mark_offline_paid` as **ca**

```yaml
student: "Aiman"
branch: "Sim Exam Branch dxpf"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-28T08-53-35/screenshots/2-actor-ca.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-28T08-53-35/screenshots/2-observer-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-28T08-53-35/screenshots/2-observer-inst.png`

### Step 3: `approve_pending_payment` as **ca**

```yaml
student: "Aiman"
branch: "Sim Exam Branch dxpf"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-28T08-53-35/screenshots/3-actor-ca.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-28T08-53-35/screenshots/3-observer-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-28T08-53-35/screenshots/3-observer-inst.png`

### Step 4: `mark_present` as **inst**

```yaml
student: "Aiman"
lesson: "Lesson 1"
mission: "Level 1"
activity: "intro"
branch: "Sim Exam Branch dxpf"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-28T08-53-35/screenshots/4-actor-inst.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-28T08-53-35/screenshots/4-observer-aa.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-28T08-53-35/screenshots/4-observer-ca.png`

## Fixtures

```json
{
  "runId": "dxpf3s",
  "branchId": "61942da7-9baa-451d-9881-ed535cbfd3a1",
  "branchName": "__sim_dxpf3s_Sim Exam Branch",
  "courseId": "8ed5e8b7-fe79-46d0-a8c1-b6cbbcb954f6",
  "courseName": "__sim_dxpf3s_ExamCourse",
  "packageId": "1863cc4f-1831-4f84-9f1e-e8f59e6dd715",
  "users": [
    {
      "handle": "aa",
      "role": "assistant_admin",
      "id": "125695da-b9a9-429a-9c71-215cd8470f25",
      "email": "__sim_dxpf3s_aa@sim.local",
      "profile": "lms-sim-dxpf3s-aa",
      "password": "simpass"
    },
    {
      "handle": "inst",
      "role": "instructor",
      "id": "86039a64-8a2a-4699-ac87-3cbd5af0a2c1",
      "email": "__sim_dxpf3s_inst@sim.local",
      "profile": "lms-sim-dxpf3s-inst",
      "password": "simpass"
    },
    {
      "handle": "ca",
      "role": "company_admin",
      "id": "04a8fff9-ec5c-4fed-8713-461cc0612069",
      "email": "__sim_dxpf3s_ca@sim.local",
      "profile": "lms-sim-dxpf3s-ca",
      "password": "simpass"
    }
  ],
  "createdVoucherCodes": [],
  "branchCity": "Sim Exam Branch dxpf"
}
```