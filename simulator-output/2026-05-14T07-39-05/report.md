# Simulator report — scenario-4b-pool-deficit

**Run dir:** /Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T07-39-05
**Steps:** 5
**Drift findings:** 0

✅ All checkpoints passed.

## Full checkpoint table

| Step | Role | Field | DOM | DB | Expected | Result |
|------|------|-------|-----|-----|----------|--------|
| 1 | instructor | `/attendance.row_visible(Ali)` | true | — | true | ✅ |
| 1 | company_admin | `/student.row_visible(Ali)` | true | — | true | ✅ |

## Per-step breakdown

### Step 1: `add_student` as **aa**

```yaml
name: "Ali"
parent_name: "PoolParent"
parent_email: "poolparent@sim.local"
parent_phone: "0123450001"
course: "__sim_bqsud4_PoolCourse"
package: "4-session"
date_of_birth: "2015-04-01"
gender: "male"
school_name: "Sim School"
branch: "Sim Pool Branch bqsu"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T07-39-05/screenshots/1-actor-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T07-39-05/screenshots/1-observer-inst.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T07-39-05/screenshots/1-observer-ca.png`

### Step 2: `add_student` as **aa**

```yaml
name: "Abu"
parent_email: "poolparent@sim.local"
parent_existing: true
course: "__sim_bqsud4_PoolCourse"
share_with_sibling: true
date_of_birth: "2017-08-15"
gender: "male"
school_name: "Sim School"
branch: "Sim Pool Branch bqsu"
```

**Error:** `clickDialogButton: no enabled button "Shared" inside dialog`

### Step 3: `mark_present` as **inst**

```yaml
student: "Abu"
lesson: "Lesson 1"
mission: "Level 1"
activity: "intro"
branch: "Sim Pool Branch bqsu"
```

**Error:** `clickButton: no button matching "Mark Abu as present" in snapshot`

### Step 4: `mark_offline_paid` as **ca**

```yaml
student: "Abu"
branch: "Sim Pool Branch bqsu"
```

**Error:** `mark_offline_paid: student "Abu" not found in branch b3da2f03-b6bf-4359-9ce8-f843d6c597a1`

### Step 5: `approve_pending_payment` as **ca**

```yaml
student: "Abu"
branch: "Sim Pool Branch bqsu"
```

**Error:** `approve_pending_payment: no pending-payment row for "Abu"`

## Fixtures

```json
{
  "runId": "bqsud4",
  "branchId": "b3da2f03-b6bf-4359-9ce8-f843d6c597a1",
  "branchName": "__sim_bqsud4_Sim Pool Branch",
  "courseId": "e54b1c80-db72-4d62-aef9-9e85fd4245d0",
  "courseName": "__sim_bqsud4_PoolCourse",
  "packageId": "ad5c7d44-c60b-475c-a423-cbd2d0bb37cd",
  "users": [
    {
      "handle": "aa",
      "role": "assistant_admin",
      "id": "b197c1af-bd0f-4a01-b1e1-3d826d8ab7bc",
      "email": "__sim_bqsud4_aa@sim.local",
      "profile": "lms-sim-bqsud4-aa",
      "password": "simpass"
    },
    {
      "handle": "inst",
      "role": "instructor",
      "id": "1ac626eb-040c-40f2-a96c-41d98777c1cf",
      "email": "__sim_bqsud4_inst@sim.local",
      "profile": "lms-sim-bqsud4-inst",
      "password": "simpass"
    },
    {
      "handle": "ca",
      "role": "company_admin",
      "id": "9d7e753b-6f6a-4670-bd85-6283c8fcac80",
      "email": "__sim_bqsud4_ca@sim.local",
      "profile": "lms-sim-bqsud4-ca",
      "password": "simpass"
    }
  ],
  "createdVoucherCodes": [],
  "branchCity": "Sim Pool Branch bqsu"
}
```