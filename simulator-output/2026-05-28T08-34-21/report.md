# Simulator report — examination-auto-levelup-tolerance

**Run dir:** /Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-28T08-34-21
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
course: "__sim_wl0d5z_ExamCourse"
package: "4-session"
date_of_birth: "2015-01-01"
gender: "male"
school_name: "Sim School"
branch: "Sim Exam Branch wl0d"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-28T08-34-21/screenshots/1-actor-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-28T08-34-21/screenshots/1-observer-inst.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-28T08-34-21/screenshots/1-observer-ca.png`

### Step 2: `mark_offline_paid` as **ca**

```yaml
student: "Aiman"
branch: "Sim Exam Branch wl0d"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-28T08-34-21/screenshots/2-actor-ca.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-28T08-34-21/screenshots/2-observer-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-28T08-34-21/screenshots/2-observer-inst.png`

### Step 3: `approve_pending_payment` as **ca**

```yaml
student: "Aiman"
branch: "Sim Exam Branch wl0d"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-28T08-34-21/screenshots/3-actor-ca.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-28T08-34-21/screenshots/3-observer-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-28T08-34-21/screenshots/3-observer-inst.png`

### Step 4: `mark_present` as **inst**

```yaml
student: "Aiman"
lesson: "Lesson 1"
mission: "Level 1"
activity: "intro"
branch: "Sim Exam Branch wl0d"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-28T08-34-21/screenshots/4-actor-inst.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-28T08-34-21/screenshots/4-observer-aa.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-28T08-34-21/screenshots/4-observer-ca.png`

## Fixtures

```json
{
  "runId": "wl0d5z",
  "branchId": "66fe2ec3-e0a2-4880-b807-0010cf1608d3",
  "branchName": "__sim_wl0d5z_Sim Exam Branch",
  "courseId": "970f3bb2-d875-48b4-816d-c22cbffa3451",
  "courseName": "__sim_wl0d5z_ExamCourse",
  "packageId": "833a30b4-f7f9-4f62-8580-598cb43a79b6",
  "users": [
    {
      "handle": "aa",
      "role": "assistant_admin",
      "id": "8637eb2e-686f-4f53-a39f-beb1b98aa390",
      "email": "__sim_wl0d5z_aa@sim.local",
      "profile": "lms-sim-wl0d5z-aa",
      "password": "simpass"
    },
    {
      "handle": "inst",
      "role": "instructor",
      "id": "6fbcf2e5-e621-496b-a825-5fffe1e6cbcd",
      "email": "__sim_wl0d5z_inst@sim.local",
      "profile": "lms-sim-wl0d5z-inst",
      "password": "simpass"
    },
    {
      "handle": "ca",
      "role": "company_admin",
      "id": "1199b562-7cbf-4630-8359-14b1e25d729f",
      "email": "__sim_wl0d5z_ca@sim.local",
      "profile": "lms-sim-wl0d5z-ca",
      "password": "simpass"
    }
  ],
  "createdVoucherCodes": [],
  "branchCity": "Sim Exam Branch wl0d"
}
```