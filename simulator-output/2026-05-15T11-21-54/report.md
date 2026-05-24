# Simulator report — scenario-16-multi-attendance-same-day

**Run dir:** /Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T11-21-54
**Steps:** 6
**Drift findings:** 0

✅ All checkpoints passed.

## Full checkpoint table

| Step | Role | Field | DOM | DB | Expected | Result |
|------|------|-------|-----|-----|----------|--------|
| 1 | instructor | `/attendance.row_visible(Ali16)` | true | — | true | ✅ |
| 1 | company_admin | `/student.row_visible(Ali16)` | true | — | true | ✅ |
| 2 | assistant_admin | `/student.row_visible(Ali16)` | true | — | true | ✅ |
| 2 | instructor | `/attendance.row_visible(Ali16)` | true | — | true | ✅ |
| 3 | assistant_admin | `/student.row_visible(Ali16)` | true | — | true | ✅ |
| 3 | instructor | `/attendance.row_visible(Ali16)` | true | — | true | ✅ |
| 4 | assistant_admin | `/student.row_visible(Ali16)` | true | — | true | ✅ |
| 4 | assistant_admin | `attendance.count` | — | 1 | 1 | ✅ |
| 4 | assistant_admin | `enrollment.sessions_remaining` | — | 3 | 3 | ✅ |
| 4 | company_admin | `/student.row_visible(Ali16)` | true | — | true | ✅ |
| 4 | company_admin | `attendance.count` | — | 1 | 1 | ✅ |
| 4 | company_admin | `enrollment.sessions_remaining` | — | 3 | 3 | ✅ |
| 5 | assistant_admin | `/student.row_visible(Ali16)` | true | — | true | ✅ |
| 5 | assistant_admin | `attendance.count` | — | 2 | 2 | ✅ |
| 5 | assistant_admin | `enrollment.sessions_remaining` | — | 2 | 2 | ✅ |
| 5 | company_admin | `/student.row_visible(Ali16)` | true | — | true | ✅ |
| 5 | company_admin | `attendance.count` | — | 2 | 2 | ✅ |
| 5 | company_admin | `enrollment.sessions_remaining` | — | 2 | 2 | ✅ |
| 6 | assistant_admin | `/student.row_visible(Ali16)` | true | — | true | ✅ |
| 6 | assistant_admin | `attendance.count` | — | 3 | 3 | ✅ |
| 6 | assistant_admin | `enrollment.sessions_remaining` | — | 1 | 1 | ✅ |
| 6 | company_admin | `/student.row_visible(Ali16)` | true | — | true | ✅ |
| 6 | company_admin | `attendance.count` | — | 3 | 3 | ✅ |
| 6 | company_admin | `enrollment.sessions_remaining` | — | 1 | 1 | ✅ |

## Per-step breakdown

### Step 1: `add_student` as **aa**

```yaml
name: "Ali16"
parent_name: "S16 Parent"
parent_email: "p16@sim.local"
parent_phone: "0123450160"
course: "__sim_6yvotg_Course16"
package: "4-session"
date_of_birth: "2015-01-01"
gender: "male"
school_name: "Sim School"
branch: "Sim S16 Branch 6yvo"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T11-21-54/screenshots/1-actor-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T11-21-54/screenshots/1-observer-inst.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T11-21-54/screenshots/1-observer-ca.png`

### Step 2: `mark_offline_paid` as **ca**

```yaml
student: "Ali16"
branch: "Sim S16 Branch 6yvo"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T11-21-54/screenshots/2-actor-ca.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T11-21-54/screenshots/2-observer-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T11-21-54/screenshots/2-observer-inst.png`

### Step 3: `approve_pending_payment` as **ca**

```yaml
student: "Ali16"
branch: "Sim S16 Branch 6yvo"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T11-21-54/screenshots/3-actor-ca.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T11-21-54/screenshots/3-observer-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T11-21-54/screenshots/3-observer-inst.png`

### Step 4: `mark_present` as **inst**

```yaml
student: "Ali16"
lesson: "Lesson 1"
mission: "Level 1"
activity: "scheduled morning session"
branch: "Sim S16 Branch 6yvo"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T11-21-54/screenshots/4-actor-inst.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T11-21-54/screenshots/4-observer-aa.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T11-21-54/screenshots/4-observer-ca.png`

### Step 5: `take_extra_attendance` as **inst**

```yaml
student: "Ali16"
course: "__sim_6yvotg_Course16"
day: "Monday"
time: "15:00"
lesson: "Lesson 1"
mission: "Level 2"
activity: "extra afternoon session"
branch: "Sim S16 Branch 6yvo"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T11-21-54/screenshots/5-actor-inst.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T11-21-54/screenshots/5-observer-aa.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T11-21-54/screenshots/5-observer-ca.png`

### Step 6: `take_extra_attendance` as **inst**

```yaml
student: "Ali16"
course: "__sim_6yvotg_Course16"
day: "Monday"
time: "17:00"
lesson: "Lesson 2"
mission: "Level 1"
activity: "extra evening session"
branch: "Sim S16 Branch 6yvo"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T11-21-54/screenshots/6-actor-inst.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T11-21-54/screenshots/6-observer-aa.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T11-21-54/screenshots/6-observer-ca.png`

## Fixtures

```json
{
  "runId": "6yvotg",
  "branchId": "21c83743-8024-4cdd-af04-ffc131ba613c",
  "branchName": "__sim_6yvotg_Sim S16 Branch",
  "courseId": "fe128f2e-261b-4c38-ac2a-48936169bcbb",
  "courseName": "__sim_6yvotg_Course16",
  "packageId": "9040052d-9e0a-4e2e-ad02-ed8404e12729",
  "users": [
    {
      "handle": "aa",
      "role": "assistant_admin",
      "id": "c09b7a82-355f-494f-8f35-7173ccb33c23",
      "email": "__sim_6yvotg_aa@sim.local",
      "profile": "lms-sim-6yvotg-aa",
      "password": "simpass"
    },
    {
      "handle": "inst",
      "role": "instructor",
      "id": "e0ed113a-4b97-4536-b364-5b7336bb0502",
      "email": "__sim_6yvotg_inst@sim.local",
      "profile": "lms-sim-6yvotg-inst",
      "password": "simpass"
    },
    {
      "handle": "ca",
      "role": "company_admin",
      "id": "bdfa9f38-a88f-4e4d-95d6-38a93422d6d4",
      "email": "__sim_6yvotg_ca@sim.local",
      "profile": "lms-sim-6yvotg-ca",
      "password": "simpass"
    }
  ],
  "createdVoucherCodes": [],
  "branchCity": "Sim S16 Branch 6yvo"
}
```