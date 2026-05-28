# Simulator report — examination-fail-reattempt-8-weeks

**Run dir:** /Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-28T09-16-07
**Steps:** 5
**Drift findings:** 0

✅ All checkpoints passed.

## Full checkpoint table

| Step | Role | Field | DOM | DB | Expected | Result |
|------|------|-------|-----|-----|----------|--------|
| 1 | instructor | `/attendance.row_visible(Carl)` | true | — | true | ✅ |
| 1 | company_admin | `/student.row_visible(Carl)` | true | — | true | ✅ |
| 2 | assistant_admin | `/student.row_visible(Carl)` | true | — | true | ✅ |
| 2 | instructor | `/attendance.row_visible(Carl)` | true | — | true | ✅ |
| 3 | assistant_admin | `/student.row_visible(Carl)` | true | — | true | ✅ |
| 3 | instructor | `/attendance.row_visible(Carl)` | true | — | true | ✅ |
| 4 | assistant_admin | `/student.row_visible(Carl)` | true | — | true | ✅ |
| 4 | company_admin | `/student.row_visible(Carl)` | true | — | true | ✅ |
| 5 | assistant_admin | `/student.row_visible(Carl)` | true | — | true | ✅ |
| 5 | instructor | `/attendance.row_visible(Carl)` | false | — | false | ✅ |

## Per-step breakdown

### Step 1: `add_student` as **aa**

```yaml
name: "Carl"
parent_name: "Fail Parent"
parent_email: "failp@sim.local"
parent_phone: "0123450095"
course: "__sim_i8imut_FailCourse"
package: "4-session"
date_of_birth: "2015-01-01"
gender: "male"
school_name: "Sim School"
branch: "Sim Fail Branch i8im"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-28T09-16-07/screenshots/1-actor-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-28T09-16-07/screenshots/1-observer-inst.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-28T09-16-07/screenshots/1-observer-ca.png`

### Step 2: `mark_offline_paid` as **ca**

```yaml
student: "Carl"
branch: "Sim Fail Branch i8im"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-28T09-16-07/screenshots/2-actor-ca.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-28T09-16-07/screenshots/2-observer-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-28T09-16-07/screenshots/2-observer-inst.png`

### Step 3: `approve_pending_payment` as **ca**

```yaml
student: "Carl"
branch: "Sim Fail Branch i8im"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-28T09-16-07/screenshots/3-actor-ca.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-28T09-16-07/screenshots/3-observer-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-28T09-16-07/screenshots/3-observer-inst.png`

### Step 4: `mark_present` as **inst**

```yaml
student: "Carl"
lesson: "Lesson 1"
mission: "Level 1"
activity: "intro"
branch: "Sim Fail Branch i8im"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-28T09-16-07/screenshots/4-actor-inst.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-28T09-16-07/screenshots/4-observer-aa.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-28T09-16-07/screenshots/4-observer-ca.png`

### Step 5: `mark_exam_decision` as **ca**

```yaml
student: "Carl"
decision: "fail"
mark: 35
branch: "Sim Fail Branch i8im"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-28T09-16-07/screenshots/5-actor-ca.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-28T09-16-07/screenshots/5-observer-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-28T09-16-07/screenshots/5-observer-inst.png`

## Fixtures

```json
{
  "runId": "i8imut",
  "branchId": "ca2a51d9-e499-47ef-8474-75ccb7ecb217",
  "branchName": "__sim_i8imut_Sim Fail Branch",
  "courseId": "7805892a-49ea-4ffe-a9fc-31c30985db09",
  "courseName": "__sim_i8imut_FailCourse",
  "packageId": "154b23b2-e918-4ca1-ad06-2b044f085db8",
  "users": [
    {
      "handle": "aa",
      "role": "assistant_admin",
      "id": "e0540b10-2e58-47f1-8a3d-bb041ef5980b",
      "email": "__sim_i8imut_aa@sim.local",
      "profile": "lms-sim-i8imut-aa",
      "password": "simpass"
    },
    {
      "handle": "inst",
      "role": "instructor",
      "id": "a8e348a1-2421-4878-920a-5f2b6f0e5bcc",
      "email": "__sim_i8imut_inst@sim.local",
      "profile": "lms-sim-i8imut-inst",
      "password": "simpass"
    },
    {
      "handle": "ca",
      "role": "company_admin",
      "id": "c2db2b79-8bd8-4234-966f-eebe4bc2a03c",
      "email": "__sim_i8imut_ca@sim.local",
      "profile": "lms-sim-i8imut-ca",
      "password": "simpass"
    }
  ],
  "createdVoucherCodes": [],
  "branchCity": "Sim Fail Branch i8im"
}
```