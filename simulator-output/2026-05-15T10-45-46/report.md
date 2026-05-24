# Simulator report — scenario-7-restoration-after-expiry

**Run dir:** /Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T10-45-46
**Steps:** 8
**Drift findings:** 0

✅ All checkpoints passed.

## Full checkpoint table

| Step | Role | Field | DOM | DB | Expected | Result |
|------|------|-------|-----|-----|----------|--------|
| 1 | instructor | `/attendance.row_visible(Ali7)` | true | — | true | ✅ |
| 1 | company_admin | `/student.row_visible(Ali7)` | true | — | true | ✅ |
| 2 | assistant_admin | `/student.row_visible(Ali7)` | true | — | true | ✅ |
| 2 | instructor | `/attendance.row_visible(Ali7)` | true | — | true | ✅ |
| 3 | assistant_admin | `/student.row_visible(Ali7)` | true | — | true | ✅ |
| 3 | instructor | `/attendance.row_visible(Ali7)` | true | — | true | ✅ |
| 4 | assistant_admin | `/student.row_visible(Ali7)` | true | — | true | ✅ |
| 4 | company_admin | `/student.row_visible(Ali7)` | true | — | true | ✅ |
| 5 | instructor | `/attendance.row_visible(Ali7)` | false | — | false | ✅ |
| 5 | company_admin | `/student.row_visible(Ali7)` | true | — | true | ✅ |
| 6 | instructor | `/attendance.row_visible(Ali7)` | false | — | false | ✅ |
| 6 | instructor | `pending_payments_table.row_visible` | — | true | true | ✅ |
| 6 | company_admin | `/student.row_visible(Ali7)` | true | — | true | ✅ |
| 6 | company_admin | `pending_payments_table.row_visible` | — | true | true | ✅ |
| 7 | assistant_admin | `/student.row_visible(Ali7)` | true | — | true | ✅ |
| 7 | instructor | `/attendance.row_visible(Ali7)` | false | — | false | ✅ |

## Per-step breakdown

### Step 1: `add_student` as **aa**

```yaml
name: "Ali7"
parent_name: "S7 Parent"
parent_email: "p7@sim.local"
parent_phone: "0123450070"
course: "__sim_exsnea_Course7"
package: "4-session"
date_of_birth: "2015-01-01"
gender: "male"
school_name: "Sim School"
branch: "Sim S7 Branch exsn"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T10-45-46/screenshots/1-actor-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T10-45-46/screenshots/1-observer-inst.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T10-45-46/screenshots/1-observer-ca.png`

### Step 2: `mark_offline_paid` as **ca**

```yaml
student: "Ali7"
branch: "Sim S7 Branch exsn"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T10-45-46/screenshots/2-actor-ca.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T10-45-46/screenshots/2-observer-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T10-45-46/screenshots/2-observer-inst.png`

### Step 3: `approve_pending_payment` as **ca**

```yaml
student: "Ali7"
branch: "Sim S7 Branch exsn"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T10-45-46/screenshots/3-actor-ca.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T10-45-46/screenshots/3-observer-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T10-45-46/screenshots/3-observer-inst.png`

### Step 4: `mark_present` as **inst**

```yaml
student: "Ali7"
lesson: "Lesson 1"
mission: "Level 1"
activity: "intro"
branch: "Sim S7 Branch exsn"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T10-45-46/screenshots/4-actor-inst.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T10-45-46/screenshots/4-observer-aa.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T10-45-46/screenshots/4-observer-ca.png`

### Step 5: `expire_enrollment` as **aa**

```yaml
student: "Ali7"
days_ago: 1
branch: "Sim S7 Branch exsn"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T10-45-46/screenshots/5-actor-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T10-45-46/screenshots/5-observer-inst.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T10-45-46/screenshots/5-observer-ca.png`

### Step 6: `add_payment_for_student` as **aa**

```yaml
student: "Ali7"
course: "__sim_exsnea_Course7"
package: "4 Sessions"
branch: "Sim S7 Branch exsn"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T10-45-46/screenshots/6-actor-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T10-45-46/screenshots/6-observer-inst.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T10-45-46/screenshots/6-observer-ca.png`

### Step 7: `mark_offline_paid` as **ca**

```yaml
student: "Ali7"
branch: "Sim S7 Branch exsn"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T10-45-46/screenshots/7-actor-ca.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T10-45-46/screenshots/7-observer-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T10-45-46/screenshots/7-observer-inst.png`

### Step 8: `approve_pending_payment` as **ca**

```yaml
student: "Ali7"
branch: "Sim S7 Branch exsn"
```

**Error:** `agent-browser failed: npx --yes agent-browser --session sim-exsnea-ca open http://localhost:3000/pending-payments
✗ Operation timed out. The page may still be loading or the element may not exist.
`

## Fixtures

```json
{
  "runId": "exsnea",
  "branchId": "50062c29-8636-4e35-9b3c-3fa96a09e000",
  "branchName": "__sim_exsnea_Sim S7 Branch",
  "courseId": "7c2cda78-106f-42c8-b50d-791cf87b9950",
  "courseName": "__sim_exsnea_Course7",
  "packageId": "96cfe491-de0d-4a97-8c1b-89d54408877e",
  "users": [
    {
      "handle": "aa",
      "role": "assistant_admin",
      "id": "f3948d84-7529-485d-8135-eb834c11e1d4",
      "email": "__sim_exsnea_aa@sim.local",
      "profile": "lms-sim-exsnea-aa",
      "password": "simpass"
    },
    {
      "handle": "inst",
      "role": "instructor",
      "id": "4f55848e-dbe0-4764-896c-5606f59f889c",
      "email": "__sim_exsnea_inst@sim.local",
      "profile": "lms-sim-exsnea-inst",
      "password": "simpass"
    },
    {
      "handle": "ca",
      "role": "company_admin",
      "id": "924d46d2-7074-4da7-9ad0-72542753740b",
      "email": "__sim_exsnea_ca@sim.local",
      "profile": "lms-sim-exsnea-ca",
      "password": "simpass"
    }
  ],
  "createdVoucherCodes": [],
  "branchCity": "Sim S7 Branch exsn"
}
```