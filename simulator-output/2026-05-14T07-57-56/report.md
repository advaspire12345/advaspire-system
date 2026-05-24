# Simulator report — scenario-4b-pool-deficit

**Run dir:** /Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T07-57-56
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

## Per-step breakdown

### Step 1: `add_student` as **aa**

```yaml
name: "Ali"
parent_name: "PoolParent"
parent_email: "poolparent@sim.local"
parent_phone: "0123450001"
course: "__sim_9jan7e_PoolCourse"
package: "4-session"
date_of_birth: "2015-04-01"
gender: "male"
school_name: "Sim School"
branch: "Sim Pool Branch 9jan"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T07-57-56/screenshots/1-actor-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T07-57-56/screenshots/1-observer-inst.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T07-57-56/screenshots/1-observer-ca.png`

### Step 2: `add_student` as **aa**

```yaml
name: "Abu"
parent_email: "poolparent@sim.local"
parent_existing: true
course: "__sim_9jan7e_PoolCourse"
share_with_sibling: true
date_of_birth: "2017-08-15"
gender: "male"
school_name: "Sim School"
branch: "Sim Pool Branch 9jan"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T07-57-56/screenshots/2-actor-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T07-57-56/screenshots/2-observer-inst.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T07-57-56/screenshots/2-observer-ca.png`

### Step 3: `mark_present` as **inst**

```yaml
student: "Abu"
lesson: "Lesson 1"
mission: "Level 1"
activity: "intro"
branch: "Sim Pool Branch 9jan"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T07-57-56/screenshots/3-actor-inst.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T07-57-56/screenshots/3-observer-aa.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T07-57-56/screenshots/3-observer-ca.png`

### Step 4: `mark_offline_paid` as **ca**

```yaml
student: "Abu"
branch: "Sim Pool Branch 9jan"
```

**Error:** `mark_offline_paid: no pending payment for "Abu"`

### Step 5: `approve_pending_payment` as **ca**

```yaml
student: "Abu"
branch: "Sim Pool Branch 9jan"
```

**Error:** `approve_pending_payment: Approve button disabled for "Abu" — payment needs paid_at + receipt_photo first`

## Fixtures

```json
{
  "runId": "9jan7e",
  "branchId": "668e55dc-34d7-495f-a5cc-2a681233cd38",
  "branchName": "__sim_9jan7e_Sim Pool Branch",
  "courseId": "fdbb9c1d-4a53-471a-af5a-c4f82b28d37e",
  "courseName": "__sim_9jan7e_PoolCourse",
  "packageId": "71b08c63-1992-4edc-9345-1976c0af995a",
  "users": [
    {
      "handle": "aa",
      "role": "assistant_admin",
      "id": "5e61cab1-2c70-40f7-9b4f-82b613fd652f",
      "email": "__sim_9jan7e_aa@sim.local",
      "profile": "lms-sim-9jan7e-aa",
      "password": "simpass"
    },
    {
      "handle": "inst",
      "role": "instructor",
      "id": "d50933a6-ea29-415d-999d-a7e67ee5d278",
      "email": "__sim_9jan7e_inst@sim.local",
      "profile": "lms-sim-9jan7e-inst",
      "password": "simpass"
    },
    {
      "handle": "ca",
      "role": "company_admin",
      "id": "0713a91b-bc2e-41bc-a60a-02862e824452",
      "email": "__sim_9jan7e_ca@sim.local",
      "profile": "lms-sim-9jan7e-ca",
      "password": "simpass"
    }
  ],
  "createdVoucherCodes": [],
  "branchCity": "Sim Pool Branch 9jan"
}
```