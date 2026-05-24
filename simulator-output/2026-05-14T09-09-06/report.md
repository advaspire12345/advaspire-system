# Simulator report — scenario-8c-individual-to-shared-negative

**Run dir:** /Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T09-09-06
**Steps:** 6
**Drift findings:** 0

✅ All checkpoints passed.

## Full checkpoint table

| Step | Role | Field | DOM | DB | Expected | Result |
|------|------|-------|-----|-----|----------|--------|
| 1 | instructor | `/attendance.row_visible(Abu8c)` | true | — | true | ✅ |
| 1 | company_admin | `/student.row_visible(Abu8c)` | true | — | true | ✅ |
| 2 | instructor | `/attendance.row_visible(Ali8c)` | true | — | true | ✅ |
| 2 | company_admin | `/student.row_visible(Ali8c)` | true | — | true | ✅ |
| 3 | assistant_admin | `/student.row_visible(Ali8c)` | true | — | true | ✅ |
| 3 | company_admin | `/student.row_visible(Ali8c)` | true | — | true | ✅ |
| 4 | instructor | `/attendance.row_visible(Ali8c)` | false | — | false | ✅ |
| 4 | company_admin | `/student.row_visible(Ali8c)` | true | — | true | ✅ |
| 5 | assistant_admin | `/student.row_visible(Ali8c)` | true | — | true | ✅ |
| 5 | instructor | `/attendance.row_visible(Ali8c)` | false | — | false | ✅ |
| 6 | assistant_admin | `/student.row_visible(Ali8c)` | true | — | true | ✅ |
| 6 | instructor | `/attendance.row_visible(Ali8c)` | false | — | false | ✅ |

## Per-step breakdown

### Step 1: `add_student` as **aa**

```yaml
name: "Abu8c"
parent_name: "8c Parent"
parent_email: "p8c@sim.local"
parent_phone: "0123450080"
course: "__sim_3ogu75_Course8c"
package: "4-session"
date_of_birth: "2016-02-10"
gender: "male"
school_name: "Sim School"
branch: "Sim 8c Branch 3ogu"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T09-09-06/screenshots/1-actor-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T09-09-06/screenshots/1-observer-inst.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T09-09-06/screenshots/1-observer-ca.png`

### Step 2: `add_student` as **aa**

```yaml
name: "Ali8c"
parent_email: "p8c@sim.local"
parent_existing: true
course: "__sim_3ogu75_Course8c"
package: "4-session"
force_individual: true
date_of_birth: "2014-03-05"
gender: "male"
school_name: "Sim School"
branch: "Sim 8c Branch 3ogu"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T09-09-06/screenshots/2-actor-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T09-09-06/screenshots/2-observer-inst.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T09-09-06/screenshots/2-observer-ca.png`

### Step 3: `mark_present` as **inst**

```yaml
student: "Ali8c"
lesson: "Lesson 1"
mission: "Level 1"
activity: "intro"
branch: "Sim 8c Branch 3ogu"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T09-09-06/screenshots/3-actor-inst.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T09-09-06/screenshots/3-observer-aa.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T09-09-06/screenshots/3-observer-ca.png`

### Step 4: `switch_to_shared` as **aa**

```yaml
student: "Ali8c"
branch: "Sim 8c Branch 3ogu"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T09-09-06/screenshots/4-actor-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T09-09-06/screenshots/4-observer-inst.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T09-09-06/screenshots/4-observer-ca.png`

### Step 5: `mark_offline_paid` as **ca**

```yaml
student: "Ali8c"
branch: "Sim 8c Branch 3ogu"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T09-09-06/screenshots/5-actor-ca.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T09-09-06/screenshots/5-observer-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T09-09-06/screenshots/5-observer-inst.png`

### Step 6: `approve_pending_payment` as **ca**

```yaml
student: "Ali8c"
branch: "Sim 8c Branch 3ogu"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T09-09-06/screenshots/6-actor-ca.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T09-09-06/screenshots/6-observer-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T09-09-06/screenshots/6-observer-inst.png`

## Fixtures

```json
{
  "runId": "3ogu75",
  "branchId": "de4eff97-5aca-4c3c-8f2b-dacfa084e0db",
  "branchName": "__sim_3ogu75_Sim 8c Branch",
  "courseId": "56c1bd46-a70c-4d36-a0f0-7fd530204e4f",
  "courseName": "__sim_3ogu75_Course8c",
  "packageId": "48a1e218-6034-4e6f-a5bb-25ebb1f4c057",
  "users": [
    {
      "handle": "aa",
      "role": "assistant_admin",
      "id": "1c363d81-51e1-481a-9aa6-6e7c5860ffb2",
      "email": "__sim_3ogu75_aa@sim.local",
      "profile": "lms-sim-3ogu75-aa",
      "password": "simpass"
    },
    {
      "handle": "inst",
      "role": "instructor",
      "id": "fd36c1fd-52a9-433f-b8c7-1fb6c6dec71d",
      "email": "__sim_3ogu75_inst@sim.local",
      "profile": "lms-sim-3ogu75-inst",
      "password": "simpass"
    },
    {
      "handle": "ca",
      "role": "company_admin",
      "id": "bc301652-a9da-457c-b462-4662cc11c451",
      "email": "__sim_3ogu75_ca@sim.local",
      "profile": "lms-sim-3ogu75-ca",
      "password": "simpass"
    }
  ],
  "createdVoucherCodes": [],
  "branchCity": "Sim 8c Branch 3ogu"
}
```