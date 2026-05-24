# Simulator report — scenario-9-auto-renewal-with-negative

**Run dir:** /Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T09-04-35
**Steps:** 7
**Drift findings:** 0

✅ All checkpoints passed.

## Full checkpoint table

| Step | Role | Field | DOM | DB | Expected | Result |
|------|------|-------|-----|-----|----------|--------|
| 1 | instructor | `/attendance.row_visible(Ali9)` | true | — | true | ✅ |
| 1 | company_admin | `/student.row_visible(Ali9)` | true | — | true | ✅ |
| 2 | assistant_admin | `/student.row_visible(Ali9)` | true | — | true | ✅ |
| 2 | instructor | `/attendance.row_visible(Ali9)` | true | — | true | ✅ |
| 3 | assistant_admin | `/student.row_visible(Ali9)` | true | — | true | ✅ |
| 3 | instructor | `/attendance.row_visible(Ali9)` | true | — | true | ✅ |
| 4 | instructor | `/attendance.row_visible(Ali9)` | true | — | true | ✅ |
| 4 | company_admin | `/student.row_visible(Ali9)` | true | — | true | ✅ |
| 5 | assistant_admin | `/student.row_visible(Ali9)` | true | — | true | ✅ |
| 5 | assistant_admin | `enrollment.sessions_remaining` | — | -1 | -1 | ✅ |
| 5 | assistant_admin | `pending_payments_table.row_visible` | — | true | true | ✅ |
| 5 | company_admin | `/student.row_visible(Ali9)` | true | — | true | ✅ |
| 5 | company_admin | `enrollment.sessions_remaining` | — | -1 | -1 | ✅ |
| 5 | company_admin | `pending_payments_table.row_visible` | — | true | true | ✅ |
| 6 | assistant_admin | `/student.row_visible(Ali9)` | true | — | true | ✅ |
| 6 | instructor | `/attendance.row_visible(Ali9)` | false | — | false | ✅ |
| 7 | assistant_admin | `/student.row_visible(Ali9)` | true | — | true | ✅ |
| 7 | assistant_admin | `enrollment.sessions_remaining` | — | 3 | 3 | ✅ |
| 7 | instructor | `/attendance.row_visible(Ali9)` | false | — | false | ✅ |
| 7 | instructor | `enrollment.sessions_remaining` | — | 3 | 3 | ✅ |

## Per-step breakdown

### Step 1: `add_student` as **aa**

```yaml
name: "Ali9"
parent_name: "S9 Parent"
parent_email: "p9@sim.local"
parent_phone: "0123450090"
course: "__sim_z3exmt_Course9"
package: "4-session"
date_of_birth: "2015-01-01"
gender: "male"
school_name: "Sim School"
branch: "Sim S9 Branch z3ex"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T09-04-35/screenshots/1-actor-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T09-04-35/screenshots/1-observer-inst.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T09-04-35/screenshots/1-observer-ca.png`

### Step 2: `mark_offline_paid` as **ca**

```yaml
student: "Ali9"
branch: "Sim S9 Branch z3ex"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T09-04-35/screenshots/2-actor-ca.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T09-04-35/screenshots/2-observer-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T09-04-35/screenshots/2-observer-inst.png`

### Step 3: `approve_pending_payment` as **ca**

```yaml
student: "Ali9"
branch: "Sim S9 Branch z3ex"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T09-04-35/screenshots/3-actor-ca.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T09-04-35/screenshots/3-observer-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T09-04-35/screenshots/3-observer-inst.png`

### Step 4: `stamp_sessions_remaining` as **aa**

```yaml
student: "Ali9"
value: 0
branch: "Sim S9 Branch z3ex"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T09-04-35/screenshots/4-actor-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T09-04-35/screenshots/4-observer-inst.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T09-04-35/screenshots/4-observer-ca.png`

### Step 5: `mark_present` as **inst**

```yaml
student: "Ali9"
lesson: "Lesson 1"
mission: "Level 1"
activity: "intro"
branch: "Sim S9 Branch z3ex"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T09-04-35/screenshots/5-actor-inst.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T09-04-35/screenshots/5-observer-aa.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T09-04-35/screenshots/5-observer-ca.png`

### Step 6: `mark_offline_paid` as **ca**

```yaml
student: "Ali9"
branch: "Sim S9 Branch z3ex"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T09-04-35/screenshots/6-actor-ca.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T09-04-35/screenshots/6-observer-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T09-04-35/screenshots/6-observer-inst.png`

### Step 7: `approve_pending_payment` as **ca**

```yaml
student: "Ali9"
branch: "Sim S9 Branch z3ex"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T09-04-35/screenshots/7-actor-ca.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T09-04-35/screenshots/7-observer-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T09-04-35/screenshots/7-observer-inst.png`

## Fixtures

```json
{
  "runId": "z3exmt",
  "branchId": "99543b52-0516-460d-8bf1-16c4b223332d",
  "branchName": "__sim_z3exmt_Sim S9 Branch",
  "courseId": "cedd2b5d-2afc-4ad8-bdc2-3702097df029",
  "courseName": "__sim_z3exmt_Course9",
  "packageId": "0b0a15d5-0f6e-40c0-ac8c-ddea0d52c635",
  "users": [
    {
      "handle": "aa",
      "role": "assistant_admin",
      "id": "0493b6bc-a43d-4a8d-8085-5274af93a5f5",
      "email": "__sim_z3exmt_aa@sim.local",
      "profile": "lms-sim-z3exmt-aa",
      "password": "simpass"
    },
    {
      "handle": "inst",
      "role": "instructor",
      "id": "befe2a53-b69a-4bbb-ab99-0d9e757add7a",
      "email": "__sim_z3exmt_inst@sim.local",
      "profile": "lms-sim-z3exmt-inst",
      "password": "simpass"
    },
    {
      "handle": "ca",
      "role": "company_admin",
      "id": "c31a8844-51e9-4392-9d19-820132540894",
      "email": "__sim_z3exmt_ca@sim.local",
      "profile": "lms-sim-z3exmt-ca",
      "password": "simpass"
    }
  ],
  "createdVoucherCodes": [],
  "branchCity": "Sim S9 Branch z3ex"
}
```