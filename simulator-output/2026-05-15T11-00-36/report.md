# Simulator report — scenario-7-restoration-after-expiry

**Run dir:** /Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T11-00-36
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
| 8 | assistant_admin | `/student.row_visible(Ali7)` | true | — | true | ✅ |
| 8 | assistant_admin | `enrollment.sessions_remaining` | — | 4 | 4 | ✅ |
| 8 | instructor | `/attendance.row_visible(Ali7)` | false | — | false | ✅ |
| 8 | instructor | `enrollment.sessions_remaining` | — | 4 | 4 | ✅ |

## Per-step breakdown

### Step 1: `add_student` as **aa**

```yaml
name: "Ali7"
parent_name: "S7 Parent"
parent_email: "p7@sim.local"
parent_phone: "0123450070"
course: "__sim_5fb346_Course7"
package: "4-session"
date_of_birth: "2015-01-01"
gender: "male"
school_name: "Sim School"
branch: "Sim S7 Branch 5fb3"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T11-00-36/screenshots/1-actor-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T11-00-36/screenshots/1-observer-inst.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T11-00-36/screenshots/1-observer-ca.png`

### Step 2: `mark_offline_paid` as **ca**

```yaml
student: "Ali7"
branch: "Sim S7 Branch 5fb3"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T11-00-36/screenshots/2-actor-ca.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T11-00-36/screenshots/2-observer-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T11-00-36/screenshots/2-observer-inst.png`

### Step 3: `approve_pending_payment` as **ca**

```yaml
student: "Ali7"
branch: "Sim S7 Branch 5fb3"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T11-00-36/screenshots/3-actor-ca.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T11-00-36/screenshots/3-observer-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T11-00-36/screenshots/3-observer-inst.png`

### Step 4: `mark_present` as **inst**

```yaml
student: "Ali7"
lesson: "Lesson 1"
mission: "Level 1"
activity: "intro"
branch: "Sim S7 Branch 5fb3"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T11-00-36/screenshots/4-actor-inst.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T11-00-36/screenshots/4-observer-aa.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T11-00-36/screenshots/4-observer-ca.png`

### Step 5: `expire_enrollment` as **aa**

```yaml
student: "Ali7"
days_ago: 1
branch: "Sim S7 Branch 5fb3"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T11-00-36/screenshots/5-actor-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T11-00-36/screenshots/5-observer-inst.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T11-00-36/screenshots/5-observer-ca.png`

### Step 6: `add_payment_for_student` as **aa**

```yaml
student: "Ali7"
course: "__sim_5fb346_Course7"
package: "4 Sessions"
branch: "Sim S7 Branch 5fb3"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T11-00-36/screenshots/6-actor-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T11-00-36/screenshots/6-observer-inst.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T11-00-36/screenshots/6-observer-ca.png`

### Step 7: `mark_offline_paid` as **ca**

```yaml
student: "Ali7"
branch: "Sim S7 Branch 5fb3"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T11-00-36/screenshots/7-actor-ca.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T11-00-36/screenshots/7-observer-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T11-00-36/screenshots/7-observer-inst.png`

### Step 8: `approve_pending_payment` as **ca**

```yaml
student: "Ali7"
branch: "Sim S7 Branch 5fb3"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T11-00-36/screenshots/8-actor-ca.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T11-00-36/screenshots/8-observer-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T11-00-36/screenshots/8-observer-inst.png`

## Fixtures

```json
{
  "runId": "5fb346",
  "branchId": "70336cc4-3a53-4b36-b49e-eaa14b47bbf6",
  "branchName": "__sim_5fb346_Sim S7 Branch",
  "courseId": "21b23e80-4a18-4700-9394-96ea411f7d51",
  "courseName": "__sim_5fb346_Course7",
  "packageId": "cb88bfac-9c11-45c0-b2d6-9b2ef7e529e4",
  "users": [
    {
      "handle": "aa",
      "role": "assistant_admin",
      "id": "662cce29-9f40-4b04-aa44-e928ee9b0382",
      "email": "__sim_5fb346_aa@sim.local",
      "profile": "lms-sim-5fb346-aa",
      "password": "simpass"
    },
    {
      "handle": "inst",
      "role": "instructor",
      "id": "6e255502-ff58-402d-b27d-c81f9237297a",
      "email": "__sim_5fb346_inst@sim.local",
      "profile": "lms-sim-5fb346-inst",
      "password": "simpass"
    },
    {
      "handle": "ca",
      "role": "company_admin",
      "id": "084c8a5b-15d3-4294-9deb-628073e151f8",
      "email": "__sim_5fb346_ca@sim.local",
      "profile": "lms-sim-5fb346-ca",
      "password": "simpass"
    }
  ],
  "createdVoucherCodes": [],
  "branchCity": "Sim S7 Branch 5fb3"
}
```