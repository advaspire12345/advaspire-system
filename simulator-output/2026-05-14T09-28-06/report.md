# Simulator report — scenario-8c-individual-to-shared-negative

**Run dir:** /Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T09-28-06
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
course: "__sim_al8i6n_Course8c"
package: "4-session"
date_of_birth: "2016-02-10"
gender: "male"
school_name: "Sim School"
branch: "Sim 8c Branch al8i"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T09-28-06/screenshots/1-actor-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T09-28-06/screenshots/1-observer-inst.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T09-28-06/screenshots/1-observer-ca.png`

### Step 2: `add_student` as **aa**

```yaml
name: "Ali8c"
parent_email: "p8c@sim.local"
parent_existing: true
course: "__sim_al8i6n_Course8c"
package: "4-session"
force_individual: true
date_of_birth: "2014-03-05"
gender: "male"
school_name: "Sim School"
branch: "Sim 8c Branch al8i"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T09-28-06/screenshots/2-actor-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T09-28-06/screenshots/2-observer-inst.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T09-28-06/screenshots/2-observer-ca.png`

### Step 3: `mark_present` as **inst**

```yaml
student: "Ali8c"
lesson: "Lesson 1"
mission: "Level 1"
activity: "intro"
branch: "Sim 8c Branch al8i"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T09-28-06/screenshots/3-actor-inst.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T09-28-06/screenshots/3-observer-aa.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T09-28-06/screenshots/3-observer-ca.png`

### Step 4: `switch_to_shared` as **aa**

```yaml
student: "Ali8c"
branch: "Sim 8c Branch al8i"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T09-28-06/screenshots/4-actor-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T09-28-06/screenshots/4-observer-inst.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T09-28-06/screenshots/4-observer-ca.png`

### Step 5: `mark_offline_paid` as **ca**

```yaml
student: "Ali8c"
branch: "Sim 8c Branch al8i"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T09-28-06/screenshots/5-actor-ca.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T09-28-06/screenshots/5-observer-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T09-28-06/screenshots/5-observer-inst.png`

### Step 6: `approve_pending_payment` as **ca**

```yaml
student: "Ali8c"
branch: "Sim 8c Branch al8i"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T09-28-06/screenshots/6-actor-ca.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T09-28-06/screenshots/6-observer-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T09-28-06/screenshots/6-observer-inst.png`

## Fixtures

```json
{
  "runId": "al8i6n",
  "branchId": "ad46f4f8-d606-4896-8f3f-7674ab4d3bd7",
  "branchName": "__sim_al8i6n_Sim 8c Branch",
  "courseId": "e99ebbd8-5156-4122-a5d8-9b47600e13f2",
  "courseName": "__sim_al8i6n_Course8c",
  "packageId": "f41b56f1-65d8-4447-bba2-3b3b0c8c8fba",
  "users": [
    {
      "handle": "aa",
      "role": "assistant_admin",
      "id": "6dbdb808-592c-4854-bfa6-fbb65f8d6bad",
      "email": "__sim_al8i6n_aa@sim.local",
      "profile": "lms-sim-al8i6n-aa",
      "password": "simpass"
    },
    {
      "handle": "inst",
      "role": "instructor",
      "id": "536b47e4-2609-4141-a1aa-a3f64892ba1f",
      "email": "__sim_al8i6n_inst@sim.local",
      "profile": "lms-sim-al8i6n-inst",
      "password": "simpass"
    },
    {
      "handle": "ca",
      "role": "company_admin",
      "id": "6c0675d7-8fe3-4ecb-8247-993f2b9c6d20",
      "email": "__sim_al8i6n_ca@sim.local",
      "profile": "lms-sim-al8i6n-ca",
      "password": "simpass"
    }
  ],
  "createdVoucherCodes": [],
  "branchCity": "Sim 8c Branch al8i"
}
```