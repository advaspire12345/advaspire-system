# Simulator report — scenario-4-three-sibling-equal-split

**Run dir:** /Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T09-47-24
**Steps:** 5
**Drift findings:** 0

✅ All checkpoints passed.

## Full checkpoint table

| Step | Role | Field | DOM | DB | Expected | Result |
|------|------|-------|-----|-----|----------|--------|
| 1 | company_admin | `/student.row_visible(Ali4)` | true | — | true | ✅ |
| 2 | company_admin | `/student.row_visible(Abu4)` | true | — | true | ✅ |
| 3 | company_admin | `/student.row_visible(Aminah4)` | true | — | true | ✅ |
| 4 | assistant_admin | `/student.row_visible(Ali4)` | true | — | true | ✅ |
| 5 | assistant_admin | `/student.row_visible(Ali4)` | true | — | true | ✅ |

## Per-step breakdown

### Step 1: `add_student` as **aa**

```yaml
name: "Ali4"
parent_name: "S4 Parent"
parent_email: "p4@sim.local"
parent_phone: "0123450040"
course: "__sim_1f8d88_S4Course"
package: "4-session"
date_of_birth: "2015-01-01"
gender: "male"
school_name: "Sim School"
branch: "Sim S4 Branch 1f8d"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T09-47-24/screenshots/1-actor-aa.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T09-47-24/screenshots/1-observer-ca.png`

### Step 2: `add_student` as **aa**

```yaml
name: "Abu4"
parent_email: "p4@sim.local"
parent_existing: true
course: "__sim_1f8d88_S4Course"
share_with_sibling: true
date_of_birth: "2017-01-01"
gender: "male"
school_name: "Sim School"
branch: "Sim S4 Branch 1f8d"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T09-47-24/screenshots/2-actor-aa.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T09-47-24/screenshots/2-observer-ca.png`

### Step 3: `add_student` as **aa**

```yaml
name: "Aminah4"
parent_email: "p4@sim.local"
parent_existing: true
course: "__sim_1f8d88_S4Course"
share_with_sibling: true
date_of_birth: "2019-01-01"
gender: "female"
school_name: "Sim School"
branch: "Sim S4 Branch 1f8d"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T09-47-24/screenshots/3-actor-aa.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T09-47-24/screenshots/3-observer-ca.png`

### Step 4: `mark_offline_paid` as **ca**

```yaml
student: "Ali4"
branch: "Sim S4 Branch 1f8d"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T09-47-24/screenshots/4-actor-ca.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T09-47-24/screenshots/4-observer-aa.png`

### Step 5: `approve_pending_payment` as **ca**

```yaml
student: "Ali4"
branch: "Sim S4 Branch 1f8d"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T09-47-24/screenshots/5-actor-ca.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T09-47-24/screenshots/5-observer-aa.png`

## Fixtures

```json
{
  "runId": "1f8d88",
  "branchId": "2c08fc51-2f2b-483c-a0cb-7e162c70a1eb",
  "branchName": "__sim_1f8d88_Sim S4 Branch",
  "courseId": "42c5b7b8-7701-4474-8952-ac2ec5ddd2fd",
  "courseName": "__sim_1f8d88_S4Course",
  "packageId": "fd574c4b-9ebf-4340-ad93-2f09847c431b",
  "users": [
    {
      "handle": "aa",
      "role": "assistant_admin",
      "id": "f3b86aeb-1b80-4055-b6c1-2c8e2c7c58aa",
      "email": "__sim_1f8d88_aa@sim.local",
      "profile": "lms-sim-1f8d88-aa",
      "password": "simpass"
    },
    {
      "handle": "ca",
      "role": "company_admin",
      "id": "45aab02f-41ac-4d06-ab6b-f4e548f02892",
      "email": "__sim_1f8d88_ca@sim.local",
      "profile": "lms-sim-1f8d88-ca",
      "password": "simpass"
    }
  ],
  "createdVoucherCodes": [],
  "branchCity": "Sim S4 Branch 1f8d"
}
```