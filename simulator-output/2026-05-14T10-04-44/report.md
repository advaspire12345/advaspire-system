# Simulator report — scenario-6c-restoration

**Run dir:** /Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T10-04-44
**Steps:** 6
**Drift findings:** 0

✅ All checkpoints passed.

## Full checkpoint table

| Step | Role | Field | DOM | DB | Expected | Result |
|------|------|-------|-----|-----|----------|--------|
| 1 | company_admin | `/student.row_visible(Ali6c)` | true | — | true | ✅ |
| 2 | company_admin | `/student.row_visible(Abu6c)` | true | — | true | ✅ |
| 3 | assistant_admin | `/student.row_visible(Ali6c)` | true | — | true | ✅ |
| 4 | assistant_admin | `/student.row_visible(Ali6c)` | true | — | true | ✅ |
| 5 | company_admin | `/student.row_visible(Abu6c)` | true | — | true | ✅ |
| 6 | company_admin | `/student.row_visible(Abu6c)` | true | — | true | ✅ |

## Per-step breakdown

### Step 1: `add_student` as **aa**

```yaml
name: "Ali6c"
parent_name: "S6c Parent"
parent_email: "p6c@sim.local"
parent_phone: "0123450063"
course: "__sim_31gd2g_S6cCourse"
package: "4-session"
date_of_birth: "2015-01-01"
gender: "male"
school_name: "Sim School"
branch: "Sim S6c Branch 31gd"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T10-04-44/screenshots/1-actor-aa.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T10-04-44/screenshots/1-observer-ca.png`

### Step 2: `add_student` as **aa**

```yaml
name: "Abu6c"
parent_email: "p6c@sim.local"
parent_existing: true
course: "__sim_31gd2g_S6cCourse"
share_with_sibling: true
date_of_birth: "2017-01-01"
gender: "male"
school_name: "Sim School"
branch: "Sim S6c Branch 31gd"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T10-04-44/screenshots/2-actor-aa.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T10-04-44/screenshots/2-observer-ca.png`

### Step 3: `mark_offline_paid` as **ca**

```yaml
student: "Ali6c"
branch: "Sim S6c Branch 31gd"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T10-04-44/screenshots/3-actor-ca.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T10-04-44/screenshots/3-observer-aa.png`

### Step 4: `approve_pending_payment` as **ca**

```yaml
student: "Ali6c"
branch: "Sim S6c Branch 31gd"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T10-04-44/screenshots/4-actor-ca.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T10-04-44/screenshots/4-observer-aa.png`

### Step 5: `cancel_enrollment` as **aa**

```yaml
student: "Abu6c"
branch: "Sim S6c Branch 31gd"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T10-04-44/screenshots/5-actor-aa.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T10-04-44/screenshots/5-observer-ca.png`

### Step 6: `cancel_enrollment` as **aa**

```yaml
student: "Abu6c"
status: "active"
branch: "Sim S6c Branch 31gd"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T10-04-44/screenshots/6-actor-aa.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T10-04-44/screenshots/6-observer-ca.png`

## Fixtures

```json
{
  "runId": "31gd2g",
  "branchId": "88340546-e6f1-4173-8821-949a2a59bde6",
  "branchName": "__sim_31gd2g_Sim S6c Branch",
  "courseId": "cbd04370-6d8a-4b09-984b-7b1f69729fb1",
  "courseName": "__sim_31gd2g_S6cCourse",
  "packageId": "6e08a7ab-1655-4501-bca5-3117b2da4211",
  "users": [
    {
      "handle": "aa",
      "role": "assistant_admin",
      "id": "c4e3bf79-0b74-4c36-8ebe-4d91600f153f",
      "email": "__sim_31gd2g_aa@sim.local",
      "profile": "lms-sim-31gd2g-aa",
      "password": "simpass"
    },
    {
      "handle": "ca",
      "role": "company_admin",
      "id": "35c6c5e3-5d19-4f07-a71a-6b3aafae64cc",
      "email": "__sim_31gd2g_ca@sim.local",
      "profile": "lms-sim-31gd2g-ca",
      "password": "simpass"
    }
  ],
  "createdVoucherCodes": [],
  "branchCity": "Sim S6c Branch 31gd"
}
```