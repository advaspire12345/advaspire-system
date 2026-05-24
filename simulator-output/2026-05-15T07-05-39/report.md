# Simulator report — scenario-8-separate-to-shared

**Run dir:** /Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T07-05-39
**Steps:** 9
**Drift findings:** 0

✅ All checkpoints passed.

## Full checkpoint table

| Step | Role | Field | DOM | DB | Expected | Result |
|------|------|-------|-----|-----|----------|--------|
| 1 | instructor | `/attendance.row_visible(Abu8)` | true | — | true | ✅ |
| 1 | company_admin | `/student.row_visible(Abu8)` | true | — | true | ✅ |
| 2 | assistant_admin | `/student.row_visible(Abu8)` | true | — | true | ✅ |
| 2 | instructor | `/attendance.row_visible(Abu8)` | true | — | true | ✅ |
| 3 | assistant_admin | `/student.row_visible(Abu8)` | true | — | true | ✅ |
| 3 | instructor | `/attendance.row_visible(Abu8)` | true | — | true | ✅ |
| 4 | instructor | `/attendance.row_visible(Abu8)` | true | — | true | ✅ |
| 4 | company_admin | `/student.row_visible(Abu8)` | true | — | true | ✅ |
| 5 | instructor | `/attendance.row_visible(Ali8)` | true | — | true | ✅ |
| 5 | company_admin | `/student.row_visible(Ali8)` | true | — | true | ✅ |
| 6 | assistant_admin | `/student.row_visible(Ali8)` | true | — | true | ✅ |
| 6 | instructor | `/attendance.row_visible(Ali8)` | true | — | true | ✅ |
| 7 | assistant_admin | `/student.row_visible(Ali8)` | true | — | true | ✅ |
| 7 | instructor | `/attendance.row_visible(Ali8)` | true | — | true | ✅ |
| 8 | instructor | `/attendance.row_visible(Ali8)` | true | — | true | ✅ |
| 8 | company_admin | `/student.row_visible(Ali8)` | true | — | true | ✅ |
| 9 | instructor | `/attendance.row_visible(Ali8)` | true | — | true | ✅ |
| 9 | instructor | `pool.sessions_remaining` | — | 18 | 18 | ✅ |
| 9 | instructor | `pool.active_students` | — | 2 | 2 | ✅ |
| 9 | instructor | `enrollment.sessions_remaining` | — | 0 | 0 | ✅ |
| 9 | company_admin | `/student.row_visible(Ali8)` | true | — | true | ✅ |
| 9 | company_admin | `pool.sessions_remaining` | — | 18 | 18 | ✅ |
| 9 | company_admin | `pool.active_students` | — | 2 | 2 | ✅ |
| 9 | company_admin | `enrollment.sessions_remaining` | — | 0 | 0 | ✅ |

## Per-step breakdown

### Step 1: `add_student` as **aa**

```yaml
name: "Abu8"
parent_name: "S8 Parent"
parent_email: "p8@sim.local"
parent_phone: "0123450081"
course: "__sim_7ozbp8_Course8"
package: "4-session"
date_of_birth: "2016-02-10"
gender: "male"
school_name: "Sim School"
branch: "Sim S8 Branch 7ozb"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T07-05-39/screenshots/1-actor-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T07-05-39/screenshots/1-observer-inst.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T07-05-39/screenshots/1-observer-ca.png`

### Step 2: `mark_offline_paid` as **ca**

```yaml
student: "Abu8"
branch: "Sim S8 Branch 7ozb"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T07-05-39/screenshots/2-actor-ca.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T07-05-39/screenshots/2-observer-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T07-05-39/screenshots/2-observer-inst.png`

### Step 3: `approve_pending_payment` as **ca**

```yaml
student: "Abu8"
branch: "Sim S8 Branch 7ozb"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T07-05-39/screenshots/3-actor-ca.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T07-05-39/screenshots/3-observer-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T07-05-39/screenshots/3-observer-inst.png`

### Step 4: `stamp_sessions_remaining` as **aa**

```yaml
student: "Abu8"
value: 10
branch: "Sim S8 Branch 7ozb"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T07-05-39/screenshots/4-actor-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T07-05-39/screenshots/4-observer-inst.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T07-05-39/screenshots/4-observer-ca.png`

### Step 5: `add_student` as **aa**

```yaml
name: "Ali8"
parent_email: "p8@sim.local"
parent_existing: true
course: "__sim_7ozbp8_Course8"
package: "4-session"
force_individual: true
date_of_birth: "2014-03-05"
gender: "male"
school_name: "Sim School"
branch: "Sim S8 Branch 7ozb"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T07-05-39/screenshots/5-actor-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T07-05-39/screenshots/5-observer-inst.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T07-05-39/screenshots/5-observer-ca.png`

### Step 6: `mark_offline_paid` as **ca**

```yaml
student: "Ali8"
branch: "Sim S8 Branch 7ozb"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T07-05-39/screenshots/6-actor-ca.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T07-05-39/screenshots/6-observer-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T07-05-39/screenshots/6-observer-inst.png`

### Step 7: `approve_pending_payment` as **ca**

```yaml
student: "Ali8"
branch: "Sim S8 Branch 7ozb"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T07-05-39/screenshots/7-actor-ca.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T07-05-39/screenshots/7-observer-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T07-05-39/screenshots/7-observer-inst.png`

### Step 8: `stamp_sessions_remaining` as **aa**

```yaml
student: "Ali8"
value: 8
branch: "Sim S8 Branch 7ozb"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T07-05-39/screenshots/8-actor-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T07-05-39/screenshots/8-observer-inst.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T07-05-39/screenshots/8-observer-ca.png`

### Step 9: `switch_to_shared` as **aa**

```yaml
student: "Ali8"
branch: "Sim S8 Branch 7ozb"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T07-05-39/screenshots/9-actor-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T07-05-39/screenshots/9-observer-inst.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T07-05-39/screenshots/9-observer-ca.png`

## Fixtures

```json
{
  "runId": "7ozbp8",
  "branchId": "5c6d86d9-8106-458b-a361-926326ddfd91",
  "branchName": "__sim_7ozbp8_Sim S8 Branch",
  "courseId": "25060f48-e2cb-4d9d-9d7d-b4fa6b6e5fe3",
  "courseName": "__sim_7ozbp8_Course8",
  "packageId": "b86d8c1e-ec85-45be-83af-77b1ffd30d56",
  "users": [
    {
      "handle": "aa",
      "role": "assistant_admin",
      "id": "4b831988-87ce-4983-bdf2-588fb7f8e64b",
      "email": "__sim_7ozbp8_aa@sim.local",
      "profile": "lms-sim-7ozbp8-aa",
      "password": "simpass"
    },
    {
      "handle": "inst",
      "role": "instructor",
      "id": "5618fc45-0c81-40ce-8bb5-3e459ec55c64",
      "email": "__sim_7ozbp8_inst@sim.local",
      "profile": "lms-sim-7ozbp8-inst",
      "password": "simpass"
    },
    {
      "handle": "ca",
      "role": "company_admin",
      "id": "fcf1b9bc-2294-4926-b132-0d4c1e007607",
      "email": "__sim_7ozbp8_ca@sim.local",
      "profile": "lms-sim-7ozbp8-ca",
      "password": "simpass"
    }
  ],
  "createdVoucherCodes": [],
  "branchCity": "Sim S8 Branch 7ozb"
}
```