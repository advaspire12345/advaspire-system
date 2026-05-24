# Simulator report — scenario-8-separate-to-shared

**Run dir:** /Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T06-45-14
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
| 9 | company_admin | `/student.row_visible(Ali8)` | true | — | true | ✅ |

## Per-step breakdown

### Step 1: `add_student` as **aa**

```yaml
name: "Abu8"
parent_name: "S8 Parent"
parent_email: "p8@sim.local"
parent_phone: "0123450081"
course: "__sim_x52v9h_Course8"
package: "4-session"
date_of_birth: "2016-02-10"
gender: "male"
school_name: "Sim School"
branch: "Sim S8 Branch x52v"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T06-45-14/screenshots/1-actor-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T06-45-14/screenshots/1-observer-inst.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T06-45-14/screenshots/1-observer-ca.png`

### Step 2: `mark_offline_paid` as **ca**

```yaml
student: "Abu8"
branch: "Sim S8 Branch x52v"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T06-45-14/screenshots/2-actor-ca.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T06-45-14/screenshots/2-observer-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T06-45-14/screenshots/2-observer-inst.png`

### Step 3: `approve_pending_payment` as **ca**

```yaml
student: "Abu8"
branch: "Sim S8 Branch x52v"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T06-45-14/screenshots/3-actor-ca.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T06-45-14/screenshots/3-observer-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T06-45-14/screenshots/3-observer-inst.png`

### Step 4: `stamp_sessions_remaining` as **aa**

```yaml
student: "Abu8"
value: 10
branch: "Sim S8 Branch x52v"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T06-45-14/screenshots/4-actor-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T06-45-14/screenshots/4-observer-inst.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T06-45-14/screenshots/4-observer-ca.png`

### Step 5: `add_student` as **aa**

```yaml
name: "Ali8"
parent_email: "p8@sim.local"
parent_existing: true
course: "__sim_x52v9h_Course8"
package: "4-session"
force_individual: true
date_of_birth: "2014-03-05"
gender: "male"
school_name: "Sim School"
branch: "Sim S8 Branch x52v"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T06-45-14/screenshots/5-actor-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T06-45-14/screenshots/5-observer-inst.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T06-45-14/screenshots/5-observer-ca.png`

### Step 6: `mark_offline_paid` as **ca**

```yaml
student: "Ali8"
branch: "Sim S8 Branch x52v"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T06-45-14/screenshots/6-actor-ca.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T06-45-14/screenshots/6-observer-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T06-45-14/screenshots/6-observer-inst.png`

### Step 7: `approve_pending_payment` as **ca**

```yaml
student: "Ali8"
branch: "Sim S8 Branch x52v"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T06-45-14/screenshots/7-actor-ca.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T06-45-14/screenshots/7-observer-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T06-45-14/screenshots/7-observer-inst.png`

### Step 8: `stamp_sessions_remaining` as **aa**

```yaml
student: "Ali8"
value: 8
branch: "Sim S8 Branch x52v"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T06-45-14/screenshots/8-actor-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T06-45-14/screenshots/8-observer-inst.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T06-45-14/screenshots/8-observer-ca.png`

### Step 9: `switch_to_shared` as **aa**

```yaml
student: "Ali8"
branch: "Sim S8 Branch x52v"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T06-45-14/screenshots/9-actor-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T06-45-14/screenshots/9-observer-inst.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T06-45-14/screenshots/9-observer-ca.png`

## Fixtures

```json
{
  "runId": "x52v9h",
  "branchId": "90e929d6-988c-4e3c-a46e-c0b23b443f79",
  "branchName": "__sim_x52v9h_Sim S8 Branch",
  "courseId": "9f516c90-9458-437f-b36e-233ea669bcb8",
  "courseName": "__sim_x52v9h_Course8",
  "packageId": "8f19305f-d97e-4e50-bdff-30425cb08b36",
  "users": [
    {
      "handle": "aa",
      "role": "assistant_admin",
      "id": "ef5266dd-2a0d-47b9-9188-a019445ed0db",
      "email": "__sim_x52v9h_aa@sim.local",
      "profile": "lms-sim-x52v9h-aa",
      "password": "simpass"
    },
    {
      "handle": "inst",
      "role": "instructor",
      "id": "17531d81-ef80-4a86-817e-ffb257ed82e9",
      "email": "__sim_x52v9h_inst@sim.local",
      "profile": "lms-sim-x52v9h-inst",
      "password": "simpass"
    },
    {
      "handle": "ca",
      "role": "company_admin",
      "id": "7a9879eb-25e3-422d-a13d-bdf3682c6b1f",
      "email": "__sim_x52v9h_ca@sim.local",
      "profile": "lms-sim-x52v9h-ca",
      "password": "simpass"
    }
  ],
  "createdVoucherCodes": [],
  "branchCity": "Sim S8 Branch x52v"
}
```