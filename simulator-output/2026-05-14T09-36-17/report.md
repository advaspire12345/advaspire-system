# Simulator report — scenario-14-shared-pool-invoice-snapshot

**Run dir:** /Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T09-36-17
**Steps:** 5
**Drift findings:** 0

✅ All checkpoints passed.

## Full checkpoint table

| Step | Role | Field | DOM | DB | Expected | Result |
|------|------|-------|-----|-----|----------|--------|
| 1 | company_admin | `/student.row_visible(Ali14)` | true | — | true | ✅ |
| 2 | company_admin | `/student.row_visible(Abu14)` | true | — | true | ✅ |
| 3 | assistant_admin | `/student.row_visible(Ali14)` | true | — | true | ✅ |
| 4 | assistant_admin | `/student.row_visible(Ali14)` | true | — | true | ✅ |
| 5 | company_admin | `/student.row_visible(Abu14)` | true | — | true | ✅ |

## Per-step breakdown

### Step 1: `add_student` as **aa**

```yaml
name: "Ali14"
parent_name: "14 Parent"
parent_email: "p14@sim.local"
parent_phone: "0123450140"
course: "__sim_e5bxn9_Coding101"
package: "4-session"
date_of_birth: "2015-04-01"
gender: "male"
school_name: "Sim School"
branch: "Sim 14 Branch e5bx"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T09-36-17/screenshots/1-actor-aa.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T09-36-17/screenshots/1-observer-ca.png`

### Step 2: `add_student` as **aa**

```yaml
name: "Abu14"
parent_email: "p14@sim.local"
parent_existing: true
course: "__sim_e5bxn9_Coding101"
share_with_sibling: true
date_of_birth: "2017-08-15"
gender: "male"
school_name: "Sim School"
branch: "Sim 14 Branch e5bx"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T09-36-17/screenshots/2-actor-aa.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T09-36-17/screenshots/2-observer-ca.png`

### Step 3: `mark_offline_paid` as **ca**

```yaml
student: "Ali14"
branch: "Sim 14 Branch e5bx"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T09-36-17/screenshots/3-actor-ca.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T09-36-17/screenshots/3-observer-aa.png`

### Step 4: `approve_pending_payment` as **ca**

```yaml
student: "Ali14"
branch: "Sim 14 Branch e5bx"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T09-36-17/screenshots/4-actor-ca.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T09-36-17/screenshots/4-observer-aa.png`

### Step 5: `cancel_enrollment` as **aa**

```yaml
student: "Abu14"
branch: "Sim 14 Branch e5bx"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T09-36-17/screenshots/5-actor-aa.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T09-36-17/screenshots/5-observer-ca.png`

## Fixtures

```json
{
  "runId": "e5bxn9",
  "branchId": "77431a73-6440-4c4d-b0d0-cbb87d8fdb55",
  "branchName": "__sim_e5bxn9_Sim 14 Branch",
  "courseId": "9329743e-48c9-45bd-961b-8a60f956298f",
  "courseName": "__sim_e5bxn9_Coding101",
  "packageId": "465a1843-1927-4f05-bfb4-e1e9809a362d",
  "users": [
    {
      "handle": "aa",
      "role": "assistant_admin",
      "id": "0e35f89f-b52a-4e35-a5cd-7b5224551a8a",
      "email": "__sim_e5bxn9_aa@sim.local",
      "profile": "lms-sim-e5bxn9-aa",
      "password": "simpass"
    },
    {
      "handle": "ca",
      "role": "company_admin",
      "id": "6c414a06-c22f-4bc7-8b79-1e6e6a2de589",
      "email": "__sim_e5bxn9_ca@sim.local",
      "profile": "lms-sim-e5bxn9-ca",
      "password": "simpass"
    }
  ],
  "createdVoucherCodes": [],
  "branchCity": "Sim 14 Branch e5bx"
}
```