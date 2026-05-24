# Simulator report — scenario-4b-pool-deficit

**Run dir:** /Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T08-04-14
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
course: "__sim_8fkf7a_PoolCourse"
package: "4-session"
date_of_birth: "2015-04-01"
gender: "male"
school_name: "Sim School"
branch: "Sim Pool Branch 8fkf"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T08-04-14/screenshots/1-actor-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T08-04-14/screenshots/1-observer-inst.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T08-04-14/screenshots/1-observer-ca.png`

### Step 2: `add_student` as **aa**

```yaml
name: "Abu"
parent_email: "poolparent@sim.local"
parent_existing: true
course: "__sim_8fkf7a_PoolCourse"
share_with_sibling: true
date_of_birth: "2017-08-15"
gender: "male"
school_name: "Sim School"
branch: "Sim Pool Branch 8fkf"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T08-04-14/screenshots/2-actor-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T08-04-14/screenshots/2-observer-inst.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T08-04-14/screenshots/2-observer-ca.png`

### Step 3: `mark_present` as **inst**

```yaml
student: "Abu"
lesson: "Lesson 1"
mission: "Level 1"
activity: "intro"
branch: "Sim Pool Branch 8fkf"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T08-04-14/screenshots/3-actor-inst.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T08-04-14/screenshots/3-observer-aa.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T08-04-14/screenshots/3-observer-ca.png`

### Step 4: `mark_offline_paid` as **ca**

```yaml
student: "Abu"
branch: "Sim Pool Branch 8fkf"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T08-04-14/screenshots/4-actor-ca.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T08-04-14/screenshots/4-observer-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T08-04-14/screenshots/4-observer-inst.png`

### Step 5: `approve_pending_payment` as **ca**

```yaml
student: "Abu"
branch: "Sim Pool Branch 8fkf"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T08-04-14/screenshots/5-actor-ca.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T08-04-14/screenshots/5-observer-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T08-04-14/screenshots/5-observer-inst.png`

## Fixtures

```json
{
  "runId": "8fkf7a",
  "branchId": "7536b1fb-d449-4709-a55c-cb3adc875d6c",
  "branchName": "__sim_8fkf7a_Sim Pool Branch",
  "courseId": "20d403a4-566b-409a-8e5e-95c6ccac2520",
  "courseName": "__sim_8fkf7a_PoolCourse",
  "packageId": "46902e94-70dc-4d2a-a03a-5192dc9b8a8c",
  "users": [
    {
      "handle": "aa",
      "role": "assistant_admin",
      "id": "57b3b802-497e-4427-a0dc-ac76d1b91331",
      "email": "__sim_8fkf7a_aa@sim.local",
      "profile": "lms-sim-8fkf7a-aa",
      "password": "simpass"
    },
    {
      "handle": "inst",
      "role": "instructor",
      "id": "6ad9db3d-8ffc-4c8e-9db5-55191581f26c",
      "email": "__sim_8fkf7a_inst@sim.local",
      "profile": "lms-sim-8fkf7a-inst",
      "password": "simpass"
    },
    {
      "handle": "ca",
      "role": "company_admin",
      "id": "7ae796c5-9392-4924-a1fc-58779c960cac",
      "email": "__sim_8fkf7a_ca@sim.local",
      "profile": "lms-sim-8fkf7a-ca",
      "password": "simpass"
    }
  ],
  "createdVoucherCodes": [],
  "branchCity": "Sim Pool Branch 8fkf"
}
```