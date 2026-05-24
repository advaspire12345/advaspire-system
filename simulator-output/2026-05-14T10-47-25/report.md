# Simulator report — scenario-15-payment-grace-period

**Run dir:** /Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T10-47-25
**Steps:** 4
**Drift findings:** 0

✅ All checkpoints passed.

## Full checkpoint table

| Step | Role | Field | DOM | DB | Expected | Result |
|------|------|-------|-----|-----|----------|--------|
| 1 | company_admin | `/student.row_visible(Ali15)` | true | — | true | ✅ |
| 2 | assistant_admin | `/student.row_visible(Ali15)` | true | — | true | ✅ |
| 3 | assistant_admin | `/student.row_visible(Ali15)` | true | — | true | ✅ |
| 4 | assistant_admin | `/student.row_visible(Ali15)` | true | — | true | ✅ |

## Per-step breakdown

### Step 1: `add_student` as **aa**

```yaml
name: "Ali15"
parent_name: "S15 Parent"
parent_email: "p15@sim.local"
parent_phone: "0123450150"
course: "__sim_2tcnjy_S15Course"
package: "4-session"
date_of_birth: "2015-01-01"
gender: "male"
school_name: "Sim School"
branch: "Sim S15 Branch 2tcn"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T10-47-25/screenshots/1-actor-aa.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T10-47-25/screenshots/1-observer-ca.png`

### Step 2: `mark_offline_paid` as **ca**

```yaml
student: "Ali15"
branch: "Sim S15 Branch 2tcn"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T10-47-25/screenshots/2-actor-ca.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T10-47-25/screenshots/2-observer-aa.png`

### Step 3: `approve_pending_payment` as **ca**

```yaml
student: "Ali15"
branch: "Sim S15 Branch 2tcn"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T10-47-25/screenshots/3-actor-ca.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T10-47-25/screenshots/3-observer-aa.png`

### Step 4: `backdate_payment` as **ca**

```yaml
student: "Ali15"
days_ago: 8
branch: "Sim S15 Branch 2tcn"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T10-47-25/screenshots/4-actor-ca.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T10-47-25/screenshots/4-observer-aa.png`

## Fixtures

```json
{
  "runId": "2tcnjy",
  "branchId": "c61bbd48-d370-4ba5-a9c4-bdf6a8fb697f",
  "branchName": "__sim_2tcnjy_Sim S15 Branch",
  "courseId": "e9fc2ef7-3409-4b3f-af37-e265f81e8156",
  "courseName": "__sim_2tcnjy_S15Course",
  "packageId": "e6a6e7b8-f813-4ccd-bb94-1888280a2d7f",
  "users": [
    {
      "handle": "aa",
      "role": "assistant_admin",
      "id": "f2d6d5d1-0b08-45b3-930f-d69b81b9445d",
      "email": "__sim_2tcnjy_aa@sim.local",
      "profile": "lms-sim-2tcnjy-aa",
      "password": "simpass"
    },
    {
      "handle": "ca",
      "role": "company_admin",
      "id": "51b20719-9cd5-4884-af82-71b156a521e8",
      "email": "__sim_2tcnjy_ca@sim.local",
      "profile": "lms-sim-2tcnjy-ca",
      "password": "simpass"
    }
  ],
  "createdVoucherCodes": [],
  "branchCity": "Sim S15 Branch 2tcn"
}
```