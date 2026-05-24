# Simulator report — scenario-4b-pool-deficit

**Run dir:** /Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T07-49-54
**Steps:** 5
**Drift findings:** 0

✅ All checkpoints passed.

## Full checkpoint table

| Step | Role | Field | DOM | DB | Expected | Result |
|------|------|-------|-----|-----|----------|--------|
| 1 | instructor | `/attendance.row_visible(Ali)` | true | — | true | ✅ |
| 1 | company_admin | `/student.row_visible(Ali)` | true | — | true | ✅ |
| 2 | instructor | `/attendance.row_visible(Abu)` | true | — | true | ✅ |
| 2 | company_admin | `/student.row_visible(Abu)` | true | — | true | ✅ |
| 3 | assistant_admin | `/student.row_visible(Abu)` | true | — | true | ✅ |
| 3 | company_admin | `/student.row_visible(Abu)` | true | — | true | ✅ |
| 4 | assistant_admin | `/student.row_visible(Abu)` | true | — | true | ✅ |
| 4 | instructor | `/attendance.row_visible(Abu)` | false | — | false | ✅ |
| 5 | assistant_admin | `/student.row_visible(Abu)` | true | — | true | ✅ |
| 5 | instructor | `/attendance.row_visible(Abu)` | false | — | false | ✅ |

## Per-step breakdown

### Step 1: `add_student` as **aa**

```yaml
name: "Ali"
parent_name: "PoolParent"
parent_email: "poolparent@sim.local"
parent_phone: "0123450001"
course: "__sim_94qej4_PoolCourse"
package: "4-session"
date_of_birth: "2015-04-01"
gender: "male"
school_name: "Sim School"
branch: "Sim Pool Branch 94qe"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T07-49-54/screenshots/1-actor-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T07-49-54/screenshots/1-observer-inst.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T07-49-54/screenshots/1-observer-ca.png`

### Step 2: `add_student` as **aa**

```yaml
name: "Abu"
parent_email: "poolparent@sim.local"
parent_existing: true
course: "__sim_94qej4_PoolCourse"
share_with_sibling: true
date_of_birth: "2017-08-15"
gender: "male"
school_name: "Sim School"
branch: "Sim Pool Branch 94qe"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T07-49-54/screenshots/2-actor-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T07-49-54/screenshots/2-observer-inst.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T07-49-54/screenshots/2-observer-ca.png`

### Step 3: `mark_present` as **inst**

```yaml
student: "Abu"
lesson: "Lesson 1"
mission: "Level 1"
activity: "intro"
branch: "Sim Pool Branch 94qe"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T07-49-54/screenshots/3-actor-inst.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T07-49-54/screenshots/3-observer-aa.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T07-49-54/screenshots/3-observer-ca.png`

### Step 4: `mark_offline_paid` as **ca**

```yaml
student: "Abu"
branch: "Sim Pool Branch 94qe"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T07-49-54/screenshots/4-actor-ca.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T07-49-54/screenshots/4-observer-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T07-49-54/screenshots/4-observer-inst.png`

### Step 5: `approve_pending_payment` as **ca**

```yaml
student: "Abu"
branch: "Sim Pool Branch 94qe"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T07-49-54/screenshots/5-actor-ca.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T07-49-54/screenshots/5-observer-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T07-49-54/screenshots/5-observer-inst.png`

## Fixtures

```json
{
  "runId": "94qej4",
  "branchId": "1d1df473-5b93-42eb-bea4-635877c04a70",
  "branchName": "__sim_94qej4_Sim Pool Branch",
  "courseId": "c17feb01-bd0f-4d5d-8b37-729253d217dc",
  "courseName": "__sim_94qej4_PoolCourse",
  "packageId": "378c0749-147a-4a22-914a-7d835be86228",
  "users": [
    {
      "handle": "aa",
      "role": "assistant_admin",
      "id": "49ac44b0-6715-46bd-ae0a-b0921c6777cf",
      "email": "__sim_94qej4_aa@sim.local",
      "profile": "lms-sim-94qej4-aa",
      "password": "simpass"
    },
    {
      "handle": "inst",
      "role": "instructor",
      "id": "18e61f1a-f185-42d9-b799-69f34e4f0b60",
      "email": "__sim_94qej4_inst@sim.local",
      "profile": "lms-sim-94qej4-inst",
      "password": "simpass"
    },
    {
      "handle": "ca",
      "role": "company_admin",
      "id": "a4a7be38-db2e-485c-bb72-6a5726f4c144",
      "email": "__sim_94qej4_ca@sim.local",
      "profile": "lms-sim-94qej4-ca",
      "password": "simpass"
    }
  ],
  "createdVoucherCodes": [],
  "branchCity": "Sim Pool Branch 94qe"
}
```