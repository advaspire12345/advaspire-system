# Simulator report — scenario-12-session-expiry

**Run dir:** /Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T10-43-19
**Steps:** 5
**Drift findings:** 0

✅ All checkpoints passed.

## Full checkpoint table

| Step | Role | Field | DOM | DB | Expected | Result |
|------|------|-------|-----|-----|----------|--------|
| 1 | instructor | `/attendance.row_visible(Ali12)` | true | — | true | ✅ |
| 1 | company_admin | `/student.row_visible(Ali12)` | true | — | true | ✅ |
| 2 | assistant_admin | `/student.row_visible(Ali12)` | true | — | true | ✅ |
| 2 | instructor | `/attendance.row_visible(Ali12)` | true | — | true | ✅ |
| 3 | assistant_admin | `/student.row_visible(Ali12)` | true | — | true | ✅ |
| 3 | instructor | `/attendance.row_visible(Ali12)` | true | — | true | ✅ |
| 4 | assistant_admin | `/student.row_visible(Ali12)` | true | — | true | ✅ |
| 4 | company_admin | `/student.row_visible(Ali12)` | true | — | true | ✅ |
| 5 | instructor | `/attendance.row_visible(Ali12)` | false | — | false | ✅ |
| 5 | company_admin | `/student.row_visible(Ali12)` | true | — | true | ✅ |

## Per-step breakdown

### Step 1: `add_student` as **aa**

```yaml
name: "Ali12"
parent_name: "S12 Parent"
parent_email: "p12@sim.local"
parent_phone: "0123450120"
course: "__sim_iona6y_S12Course"
package: "4-session"
date_of_birth: "2015-01-01"
gender: "male"
school_name: "Sim School"
branch: "Sim S12 Branch iona"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T10-43-19/screenshots/1-actor-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T10-43-19/screenshots/1-observer-inst.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T10-43-19/screenshots/1-observer-ca.png`

### Step 2: `mark_offline_paid` as **ca**

```yaml
student: "Ali12"
branch: "Sim S12 Branch iona"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T10-43-19/screenshots/2-actor-ca.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T10-43-19/screenshots/2-observer-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T10-43-19/screenshots/2-observer-inst.png`

### Step 3: `approve_pending_payment` as **ca**

```yaml
student: "Ali12"
branch: "Sim S12 Branch iona"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T10-43-19/screenshots/3-actor-ca.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T10-43-19/screenshots/3-observer-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T10-43-19/screenshots/3-observer-inst.png`

### Step 4: `mark_present` as **inst**

```yaml
student: "Ali12"
lesson: "Lesson 1"
mission: "Level 1"
activity: "intro"
branch: "Sim S12 Branch iona"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T10-43-19/screenshots/4-actor-inst.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T10-43-19/screenshots/4-observer-aa.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T10-43-19/screenshots/4-observer-ca.png`

### Step 5: `expire_enrollment` as **aa**

```yaml
student: "Ali12"
days_ago: 1
branch: "Sim S12 Branch iona"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T10-43-19/screenshots/5-actor-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T10-43-19/screenshots/5-observer-inst.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T10-43-19/screenshots/5-observer-ca.png`

## Fixtures

```json
{
  "runId": "iona6y",
  "branchId": "53233362-ab8e-4970-a969-1d21f64899b2",
  "branchName": "__sim_iona6y_Sim S12 Branch",
  "courseId": "9c428e54-d2f7-4240-adae-01a4664d2583",
  "courseName": "__sim_iona6y_S12Course",
  "packageId": "084eade5-74ba-4559-9b5c-1fd0018da75a",
  "users": [
    {
      "handle": "aa",
      "role": "assistant_admin",
      "id": "522b5819-c08b-46a7-a1e1-a16d231f9d36",
      "email": "__sim_iona6y_aa@sim.local",
      "profile": "lms-sim-iona6y-aa",
      "password": "simpass"
    },
    {
      "handle": "inst",
      "role": "instructor",
      "id": "c0523483-47df-43db-94e9-c1ca05b0670a",
      "email": "__sim_iona6y_inst@sim.local",
      "profile": "lms-sim-iona6y-inst",
      "password": "simpass"
    },
    {
      "handle": "ca",
      "role": "company_admin",
      "id": "f59bbb37-5268-42e7-bb7a-796c69c6058f",
      "email": "__sim_iona6y_ca@sim.local",
      "profile": "lms-sim-iona6y-ca",
      "password": "simpass"
    }
  ],
  "createdVoucherCodes": [],
  "branchCity": "Sim S12 Branch iona"
}
```