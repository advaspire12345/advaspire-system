# Simulator report — examination-auto-levelup-tolerance

**Run dir:** /Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-28T08-23-54
**Steps:** 5
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
course: "__sim_qmlgry_ExamCourse"
package: "4-session"
date_of_birth: "2015-01-01"
gender: "male"
school_name: "Sim School"
branch: "Sim Exam Branch qmlg"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-28T08-23-54/screenshots/1-actor-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-28T08-23-54/screenshots/1-observer-inst.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-28T08-23-54/screenshots/1-observer-ca.png`

### Step 2: `mark_offline_paid` as **ca**

```yaml
student: "Aiman"
branch: "Sim Exam Branch qmlg"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-28T08-23-54/screenshots/2-actor-ca.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-28T08-23-54/screenshots/2-observer-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-28T08-23-54/screenshots/2-observer-inst.png`

### Step 3: `approve_pending_payment` as **ca**

```yaml
student: "Aiman"
branch: "Sim Exam Branch qmlg"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-28T08-23-54/screenshots/3-actor-ca.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-28T08-23-54/screenshots/3-observer-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-28T08-23-54/screenshots/3-observer-inst.png`

### Step 4: `mark_present` as **inst**

```yaml
student: "Aiman"
lesson: "Lesson 1"
mission: "Level 1"
activity: "intro"
branch: "Sim Exam Branch qmlg"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-28T08-23-54/screenshots/4-actor-inst.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-28T08-23-54/screenshots/4-observer-aa.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-28T08-23-54/screenshots/4-observer-ca.png`

### Step 5: `mark_present` as **inst**

```yaml
student: "Aiman"
lesson: "Lesson 2"
mission: "Level 1"
activity: "build"
branch: "Sim Exam Branch qmlg"
```

**Error:** `clickButton: no button matching "Mark Aiman as present" in snapshot`

## Fixtures

```json
{
  "runId": "qmlgry",
  "branchId": "1e3ed8ec-13fe-4dba-bcd2-3e8db68fab24",
  "branchName": "__sim_qmlgry_Sim Exam Branch",
  "courseId": "3bb750f3-0280-41cc-8f64-690b14ff8df7",
  "courseName": "__sim_qmlgry_ExamCourse",
  "packageId": "3f3d925c-7e66-40cf-8235-374d372a7e5e",
  "users": [
    {
      "handle": "aa",
      "role": "assistant_admin",
      "id": "5b3c3173-3aa2-4ac6-9c23-3e9640e50a78",
      "email": "__sim_qmlgry_aa@sim.local",
      "profile": "lms-sim-qmlgry-aa",
      "password": "simpass"
    },
    {
      "handle": "inst",
      "role": "instructor",
      "id": "17c2a04e-725e-4c3a-b2e1-12510f71a28f",
      "email": "__sim_qmlgry_inst@sim.local",
      "profile": "lms-sim-qmlgry-inst",
      "password": "simpass"
    },
    {
      "handle": "ca",
      "role": "company_admin",
      "id": "18151260-5fae-45b1-9dff-b00a4724cb6a",
      "email": "__sim_qmlgry_ca@sim.local",
      "profile": "lms-sim-qmlgry-ca",
      "password": "simpass"
    }
  ],
  "createdVoucherCodes": [],
  "branchCity": "Sim Exam Branch qmlg"
}
```