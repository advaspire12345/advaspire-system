# Simulator report — scenario-4b-pool-deficit

**Run dir:** /Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T07-43-50
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
| 4 | assistant_admin | `/student.row_visible(Abu)` | true | — | true | ✅ |
| 4 | instructor | `/attendance.row_visible(Abu)` | true | — | true | ✅ |
| 5 | assistant_admin | `/student.row_visible(Abu)` | true | — | true | ✅ |
| 5 | instructor | `/attendance.row_visible(Abu)` | true | — | true | ✅ |

## Per-step breakdown

### Step 1: `add_student` as **aa**

```yaml
name: "Ali"
parent_name: "PoolParent"
parent_email: "poolparent@sim.local"
parent_phone: "0123450001"
course: "__sim_pymj82_PoolCourse"
package: "4-session"
date_of_birth: "2015-04-01"
gender: "male"
school_name: "Sim School"
branch: "Sim Pool Branch pymj"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T07-43-50/screenshots/1-actor-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T07-43-50/screenshots/1-observer-inst.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T07-43-50/screenshots/1-observer-ca.png`

### Step 2: `add_student` as **aa**

```yaml
name: "Abu"
parent_email: "poolparent@sim.local"
parent_existing: true
course: "__sim_pymj82_PoolCourse"
share_with_sibling: true
date_of_birth: "2017-08-15"
gender: "male"
school_name: "Sim School"
branch: "Sim Pool Branch pymj"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T07-43-50/screenshots/2-actor-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T07-43-50/screenshots/2-observer-inst.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T07-43-50/screenshots/2-observer-ca.png`

### Step 3: `mark_present` as **inst**

```yaml
student: "Abu"
lesson: "Lesson 1"
mission: "Level 1"
activity: "intro"
branch: "Sim Pool Branch pymj"
```

**Error:** `selectByLabel: no combobox "Lesson" in snapshot`

### Step 4: `mark_offline_paid` as **ca**

```yaml
student: "Abu"
branch: "Sim Pool Branch pymj"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T07-43-50/screenshots/4-actor-ca.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T07-43-50/screenshots/4-observer-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T07-43-50/screenshots/4-observer-inst.png`

### Step 5: `approve_pending_payment` as **ca**

```yaml
student: "Abu"
branch: "Sim Pool Branch pymj"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T07-43-50/screenshots/5-actor-ca.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T07-43-50/screenshots/5-observer-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T07-43-50/screenshots/5-observer-inst.png`

## Fixtures

```json
{
  "runId": "pymj82",
  "branchId": "a35572fb-425f-49f8-b5ea-b7c19585f46d",
  "branchName": "__sim_pymj82_Sim Pool Branch",
  "courseId": "1dc0d4c5-c412-48aa-8069-e10ea24cb9ea",
  "courseName": "__sim_pymj82_PoolCourse",
  "packageId": "08a94bbd-19da-438e-906f-54897a3bbea2",
  "users": [
    {
      "handle": "aa",
      "role": "assistant_admin",
      "id": "e0995f0f-1a49-43cd-ad34-e607d56ac2d2",
      "email": "__sim_pymj82_aa@sim.local",
      "profile": "lms-sim-pymj82-aa",
      "password": "simpass"
    },
    {
      "handle": "inst",
      "role": "instructor",
      "id": "6ddf15c1-118b-45e2-99d6-a14e53775d54",
      "email": "__sim_pymj82_inst@sim.local",
      "profile": "lms-sim-pymj82-inst",
      "password": "simpass"
    },
    {
      "handle": "ca",
      "role": "company_admin",
      "id": "cad8988a-bb9c-4257-acb9-cbf02ecf6db1",
      "email": "__sim_pymj82_ca@sim.local",
      "profile": "lms-sim-pymj82-ca",
      "password": "simpass"
    }
  ],
  "createdVoucherCodes": [],
  "branchCity": "Sim Pool Branch pymj"
}
```