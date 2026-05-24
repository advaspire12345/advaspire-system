# Simulator report — scenario-17-package-upgrade

**Run dir:** /Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T07-29-36
**Steps:** 4
**Drift findings:** 0

✅ All checkpoints passed.

## Full checkpoint table

| Step | Role | Field | DOM | DB | Expected | Result |
|------|------|-------|-----|-----|----------|--------|
| 1 | company_admin | `/student.row_visible(Jacky)` | true | — | true | ✅ |
| 1 | company_admin | `pending_payments_table.row_visible` | — | true | true | ✅ |
| 2 | assistant_admin | `/student.row_visible(Jacky)` | true | — | true | ✅ |
| 3 | assistant_admin | `/student.row_visible(Jacky)` | true | — | true | ✅ |
| 4 | assistant_admin | `/student.row_visible(Jacky)` | true | — | true | ✅ |
| 4 | assistant_admin | `student_table.period_active` | — | 12 | 12 | ✅ |
| 4 | assistant_admin | `student_table.payment_settled` | — | 627 | 627 | ✅ |

## Per-step breakdown

### Step 1: `add_student` as **aa**

```yaml
name: "Jacky"
parent_name: "Jacky Parent"
parent_email: "jacky@sim.local"
parent_phone: "0123456788"
course: "__sim_fqa4ub_UpgradeCourse"
package: "4-session"
date_of_birth: "2014-06-12"
gender: "male"
school_name: "Sim School"
branch: "Sim Upgrade Branch fqa4"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T07-29-36/screenshots/1-actor-aa.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T07-29-36/screenshots/1-observer-ca.png`

### Step 2: `edit_pending_payment` as **ca**

```yaml
student: "Jacky"
new_package: "12 Sessions"
branch: "Sim Upgrade Branch fqa4"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T07-29-36/screenshots/2-actor-ca.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T07-29-36/screenshots/2-observer-aa.png`

### Step 3: `mark_offline_paid` as **ca**

```yaml
student: "Jacky"
branch: "Sim Upgrade Branch fqa4"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T07-29-36/screenshots/3-actor-ca.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T07-29-36/screenshots/3-observer-aa.png`

### Step 4: `approve_pending_payment` as **ca**

```yaml
student: "Jacky"
branch: "Sim Upgrade Branch fqa4"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T07-29-36/screenshots/4-actor-ca.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T07-29-36/screenshots/4-observer-aa.png`

## Fixtures

```json
{
  "runId": "fqa4ub",
  "branchId": "222df05e-a96f-46ab-a98c-b40faf09c301",
  "branchName": "__sim_fqa4ub_Sim Upgrade Branch",
  "courseId": "76386158-ead0-436c-b829-84e8284900fc",
  "courseName": "__sim_fqa4ub_UpgradeCourse",
  "packageId": "ca2aeaca-693f-4429-bf98-7bba0b330738",
  "users": [
    {
      "handle": "aa",
      "role": "assistant_admin",
      "id": "4ddfae71-b295-4b66-85d8-9169b858ffb1",
      "email": "__sim_fqa4ub_aa@sim.local",
      "profile": "lms-sim-fqa4ub-aa",
      "password": "simpass"
    },
    {
      "handle": "ca",
      "role": "company_admin",
      "id": "02be60c0-e56a-45af-be61-dd83f75e6f4d",
      "email": "__sim_fqa4ub_ca@sim.local",
      "profile": "lms-sim-fqa4ub-ca",
      "password": "simpass"
    }
  ],
  "createdVoucherCodes": [],
  "branchCity": "Sim Upgrade Branch fqa4"
}
```