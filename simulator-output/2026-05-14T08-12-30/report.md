# Simulator report — scenario-6b-pool-dissolve

**Run dir:** /Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T08-12-30
**Steps:** 5
**Drift findings:** 0

✅ All checkpoints passed.

## Full checkpoint table

| Step | Role | Field | DOM | DB | Expected | Result |
|------|------|-------|-----|-----|----------|--------|
| 1 | company_admin | `/student.row_visible(Ali6b)` | true | — | true | ✅ |
| 2 | company_admin | `/student.row_visible(Abu6b)` | true | — | true | ✅ |
| 3 | assistant_admin | `/student.row_visible(Ali6b)` | true | — | true | ✅ |
| 4 | assistant_admin | `/student.row_visible(Ali6b)` | true | — | true | ✅ |
| 5 | company_admin | `/student.row_visible(Abu6b)` | true | — | true | ✅ |

## Per-step breakdown

### Step 1: `add_student` as **aa**

```yaml
name: "Ali6b"
parent_name: "Dissolve Parent"
parent_email: "dissolve@sim.local"
parent_phone: "0123450060"
course: "__sim_wq6412_DissolveCourse"
package: "4-session"
date_of_birth: "2015-04-01"
gender: "male"
school_name: "Sim School"
branch: "Sim Dissolve Branch wq64"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T08-12-30/screenshots/1-actor-aa.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T08-12-30/screenshots/1-observer-ca.png`

### Step 2: `add_student` as **aa**

```yaml
name: "Abu6b"
parent_email: "dissolve@sim.local"
parent_existing: true
course: "__sim_wq6412_DissolveCourse"
share_with_sibling: true
date_of_birth: "2017-08-15"
gender: "male"
school_name: "Sim School"
branch: "Sim Dissolve Branch wq64"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T08-12-30/screenshots/2-actor-aa.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T08-12-30/screenshots/2-observer-ca.png`

### Step 3: `mark_offline_paid` as **ca**

```yaml
student: "Ali6b"
branch: "Sim Dissolve Branch wq64"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T08-12-30/screenshots/3-actor-ca.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T08-12-30/screenshots/3-observer-aa.png`

### Step 4: `approve_pending_payment` as **ca**

```yaml
student: "Ali6b"
branch: "Sim Dissolve Branch wq64"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T08-12-30/screenshots/4-actor-ca.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T08-12-30/screenshots/4-observer-aa.png`

### Step 5: `cancel_enrollment` as **aa**

```yaml
student: "Abu6b"
branch: "Sim Dissolve Branch wq64"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T08-12-30/screenshots/5-actor-aa.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T08-12-30/screenshots/5-observer-ca.png`

## Fixtures

```json
{
  "runId": "wq6412",
  "branchId": "9bff1622-b453-4e9b-9823-a39cd00a3a28",
  "branchName": "__sim_wq6412_Sim Dissolve Branch",
  "courseId": "2d3c440a-2515-413b-b6ba-d0a679e260c4",
  "courseName": "__sim_wq6412_DissolveCourse",
  "packageId": "5d4e881a-309e-47db-86cb-6d8c46ad7473",
  "users": [
    {
      "handle": "aa",
      "role": "assistant_admin",
      "id": "d091b7da-3812-402c-a1af-43f27f6c68f2",
      "email": "__sim_wq6412_aa@sim.local",
      "profile": "lms-sim-wq6412-aa",
      "password": "simpass"
    },
    {
      "handle": "ca",
      "role": "company_admin",
      "id": "eec75e4f-b158-4c30-b5c2-64b65f8f4eb9",
      "email": "__sim_wq6412_ca@sim.local",
      "profile": "lms-sim-wq6412-ca",
      "password": "simpass"
    }
  ],
  "createdVoucherCodes": [],
  "branchCity": "Sim Dissolve Branch wq64"
}
```