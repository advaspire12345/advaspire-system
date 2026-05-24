# Simulator report — scenario-5b-three-sibling-cancel-with-sessions

**Run dir:** /Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T09-56-53
**Steps:** 6
**Drift findings:** 0

✅ All checkpoints passed.

## Full checkpoint table

| Step | Role | Field | DOM | DB | Expected | Result |
|------|------|-------|-----|-----|----------|--------|
| 1 | company_admin | `/student.row_visible(Ali5b)` | true | — | true | ✅ |
| 2 | company_admin | `/student.row_visible(Abu5b)` | true | — | true | ✅ |
| 3 | company_admin | `/student.row_visible(Aminah5b)` | true | — | true | ✅ |
| 4 | assistant_admin | `/student.row_visible(Ali5b)` | true | — | true | ✅ |
| 5 | assistant_admin | `/student.row_visible(Ali5b)` | true | — | true | ✅ |
| 6 | company_admin | `/student.row_visible(Aminah5b)` | true | — | true | ✅ |

## Per-step breakdown

### Step 1: `add_student` as **aa**

```yaml
name: "Ali5b"
parent_name: "S5b Parent"
parent_email: "p5b@sim.local"
parent_phone: "0123450051"
course: "__sim_zr245q_S5bCourse"
package: "4-session"
date_of_birth: "2015-01-01"
gender: "male"
school_name: "Sim School"
branch: "Sim S5b Branch zr24"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T09-56-53/screenshots/1-actor-aa.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T09-56-53/screenshots/1-observer-ca.png`

### Step 2: `add_student` as **aa**

```yaml
name: "Abu5b"
parent_email: "p5b@sim.local"
parent_existing: true
course: "__sim_zr245q_S5bCourse"
share_with_sibling: true
date_of_birth: "2017-01-01"
gender: "male"
school_name: "Sim School"
branch: "Sim S5b Branch zr24"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T09-56-53/screenshots/2-actor-aa.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T09-56-53/screenshots/2-observer-ca.png`

### Step 3: `add_student` as **aa**

```yaml
name: "Aminah5b"
parent_email: "p5b@sim.local"
parent_existing: true
course: "__sim_zr245q_S5bCourse"
share_with_sibling: true
date_of_birth: "2019-01-01"
gender: "female"
school_name: "Sim School"
branch: "Sim S5b Branch zr24"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T09-56-53/screenshots/3-actor-aa.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T09-56-53/screenshots/3-observer-ca.png`

### Step 4: `mark_offline_paid` as **ca**

```yaml
student: "Ali5b"
branch: "Sim S5b Branch zr24"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T09-56-53/screenshots/4-actor-ca.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T09-56-53/screenshots/4-observer-aa.png`

### Step 5: `approve_pending_payment` as **ca**

```yaml
student: "Ali5b"
branch: "Sim S5b Branch zr24"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T09-56-53/screenshots/5-actor-ca.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T09-56-53/screenshots/5-observer-aa.png`

### Step 6: `cancel_enrollment` as **aa**

```yaml
student: "Aminah5b"
branch: "Sim S5b Branch zr24"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T09-56-53/screenshots/6-actor-aa.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T09-56-53/screenshots/6-observer-ca.png`

## Fixtures

```json
{
  "runId": "zr245q",
  "branchId": "0a61333d-c2ad-47ad-b5b1-a84fbaba4be0",
  "branchName": "__sim_zr245q_Sim S5b Branch",
  "courseId": "8d839ca4-308a-46a9-b03a-c5e8f91bf093",
  "courseName": "__sim_zr245q_S5bCourse",
  "packageId": "97a1c67c-f685-4eee-9721-b662c8ef78b4",
  "users": [
    {
      "handle": "aa",
      "role": "assistant_admin",
      "id": "a7d71bdc-b959-4d5f-876b-873e609d0e90",
      "email": "__sim_zr245q_aa@sim.local",
      "profile": "lms-sim-zr245q-aa",
      "password": "simpass"
    },
    {
      "handle": "ca",
      "role": "company_admin",
      "id": "963616f4-2cd9-4155-a8d6-0f88949df32f",
      "email": "__sim_zr245q_ca@sim.local",
      "profile": "lms-sim-zr245q-ca",
      "password": "simpass"
    }
  ],
  "createdVoucherCodes": [],
  "branchCity": "Sim S5b Branch zr24"
}
```