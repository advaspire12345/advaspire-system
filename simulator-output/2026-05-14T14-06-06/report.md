# Simulator report — scenario-8c-individual-to-shared-negative

**Run dir:** /Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T14-06-06
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
course: "__sim_yil4qa_Course8c"
package: "4-session"
date_of_birth: "2016-02-10"
gender: "male"
school_name: "Sim School"
branch: "Sim 8c Branch yil4"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T14-06-06/screenshots/1-actor-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T14-06-06/screenshots/1-observer-inst.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T14-06-06/screenshots/1-observer-ca.png`

### Step 2: `add_student` as **aa**

```yaml
name: "Ali8c"
parent_email: "p8c@sim.local"
parent_existing: true
course: "__sim_yil4qa_Course8c"
package: "4-session"
force_individual: true
date_of_birth: "2014-03-05"
gender: "male"
school_name: "Sim School"
branch: "Sim 8c Branch yil4"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T14-06-06/screenshots/2-actor-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T14-06-06/screenshots/2-observer-inst.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T14-06-06/screenshots/2-observer-ca.png`

### Step 3: `mark_present` as **inst**

```yaml
student: "Ali8c"
lesson: "Lesson 1"
mission: "Level 1"
activity: "intro"
branch: "Sim 8c Branch yil4"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T14-06-06/screenshots/3-actor-inst.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T14-06-06/screenshots/3-observer-aa.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T14-06-06/screenshots/3-observer-ca.png`

### Step 4: `switch_to_shared` as **aa**

```yaml
student: "Ali8c"
branch: "Sim 8c Branch yil4"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T14-06-06/screenshots/4-actor-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T14-06-06/screenshots/4-observer-inst.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T14-06-06/screenshots/4-observer-ca.png`

### Step 5: `mark_offline_paid` as **ca**

```yaml
student: "Ali8c"
branch: "Sim 8c Branch yil4"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T14-06-06/screenshots/5-actor-ca.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T14-06-06/screenshots/5-observer-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T14-06-06/screenshots/5-observer-inst.png`

### Step 6: `approve_pending_payment` as **ca**

```yaml
student: "Ali8c"
branch: "Sim 8c Branch yil4"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T14-06-06/screenshots/6-actor-ca.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T14-06-06/screenshots/6-observer-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T14-06-06/screenshots/6-observer-inst.png`

## Fixtures

```json
{
  "runId": "yil4qa",
  "branchId": "2ce678db-244b-4b99-85d5-dbce0c4299d0",
  "branchName": "__sim_yil4qa_Sim 8c Branch",
  "courseId": "51b32e74-9702-4b41-9121-b8c2b0f346ea",
  "courseName": "__sim_yil4qa_Course8c",
  "packageId": "0660aae9-4d55-49ba-9e8c-2d40afb09a21",
  "users": [
    {
      "handle": "aa",
      "role": "assistant_admin",
      "id": "28331f4c-9566-4039-ba99-56a855d7a702",
      "email": "__sim_yil4qa_aa@sim.local",
      "profile": "lms-sim-yil4qa-aa",
      "password": "simpass"
    },
    {
      "handle": "inst",
      "role": "instructor",
      "id": "8e498664-5ff3-4741-a3aa-8b42b730744e",
      "email": "__sim_yil4qa_inst@sim.local",
      "profile": "lms-sim-yil4qa-inst",
      "password": "simpass"
    },
    {
      "handle": "ca",
      "role": "company_admin",
      "id": "f3f0e442-c0d7-407a-b377-71f2437c257c",
      "email": "__sim_yil4qa_ca@sim.local",
      "profile": "lms-sim-yil4qa-ca",
      "password": "simpass"
    }
  ],
  "createdVoucherCodes": [],
  "branchCity": "Sim 8c Branch yil4"
}
```