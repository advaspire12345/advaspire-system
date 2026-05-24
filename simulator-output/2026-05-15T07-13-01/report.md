# Simulator report — scenario-3-pool-absorption-2-sibling

**Run dir:** /Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T07-13-01
**Steps:** 8
**Drift findings:** 0

✅ All checkpoints passed.

## Full checkpoint table

| Step | Role | Field | DOM | DB | Expected | Result |
|------|------|-------|-----|-----|----------|--------|
| 1 | instructor | `/attendance.row_visible(Abu3)` | true | — | true | ✅ |
| 1 | company_admin | `/student.row_visible(Abu3)` | true | — | true | ✅ |
| 2 | assistant_admin | `/student.row_visible(Abu3)` | true | — | true | ✅ |
| 2 | instructor | `/attendance.row_visible(Abu3)` | true | — | true | ✅ |
| 3 | assistant_admin | `/student.row_visible(Abu3)` | true | — | true | ✅ |
| 3 | instructor | `/attendance.row_visible(Abu3)` | true | — | true | ✅ |
| 4 | instructor | `/attendance.row_visible(Ali3)` | true | — | true | ✅ |
| 4 | company_admin | `/student.row_visible(Ali3)` | true | — | true | ✅ |
| 5 | assistant_admin | `/student.row_visible(Ali3)` | true | — | true | ✅ |
| 5 | instructor | `/attendance.row_visible(Ali3)` | true | — | true | ✅ |
| 6 | assistant_admin | `/student.row_visible(Ali3)` | true | — | true | ✅ |
| 6 | instructor | `/attendance.row_visible(Ali3)` | true | — | true | ✅ |
| 7 | instructor | `/attendance.row_visible(Ali3)` | true | — | true | ✅ |
| 7 | company_admin | `/student.row_visible(Ali3)` | true | — | true | ✅ |
| 8 | instructor | `/attendance.row_visible(Ali3)` | true | — | true | ✅ |
| 8 | instructor | `pool.sessions_remaining` | — | 12 | 12 | ✅ |
| 8 | instructor | `pool.active_students` | — | 2 | 2 | ✅ |
| 8 | instructor | `enrollment.sessions_remaining` | — | 0 | 0 | ✅ |
| 8 | company_admin | `/student.row_visible(Ali3)` | true | — | true | ✅ |
| 8 | company_admin | `pool.sessions_remaining` | — | 12 | 12 | ✅ |
| 8 | company_admin | `pool.active_students` | — | 2 | 2 | ✅ |
| 8 | company_admin | `enrollment.sessions_remaining` | — | 0 | 0 | ✅ |

## Per-step breakdown

### Step 1: `add_student` as **aa**

```yaml
name: "Abu3"
parent_name: "S3 Parent"
parent_email: "p3@sim.local"
parent_phone: "0123450031"
course: "__sim_wvsrvt_Course3"
package: "4-session"
date_of_birth: "2016-02-10"
gender: "male"
school_name: "Sim School"
branch: "Sim S3 Branch wvsr"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T07-13-01/screenshots/1-actor-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T07-13-01/screenshots/1-observer-inst.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T07-13-01/screenshots/1-observer-ca.png`

### Step 2: `mark_offline_paid` as **ca**

```yaml
student: "Abu3"
branch: "Sim S3 Branch wvsr"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T07-13-01/screenshots/2-actor-ca.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T07-13-01/screenshots/2-observer-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T07-13-01/screenshots/2-observer-inst.png`

### Step 3: `approve_pending_payment` as **ca**

```yaml
student: "Abu3"
branch: "Sim S3 Branch wvsr"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T07-13-01/screenshots/3-actor-ca.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T07-13-01/screenshots/3-observer-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T07-13-01/screenshots/3-observer-inst.png`

### Step 4: `add_student` as **aa**

```yaml
name: "Ali3"
parent_email: "p3@sim.local"
parent_existing: true
course: "__sim_wvsrvt_Course3"
package: "4-session"
force_individual: true
date_of_birth: "2014-03-05"
gender: "male"
school_name: "Sim School"
branch: "Sim S3 Branch wvsr"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T07-13-01/screenshots/4-actor-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T07-13-01/screenshots/4-observer-inst.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T07-13-01/screenshots/4-observer-ca.png`

### Step 5: `mark_offline_paid` as **ca**

```yaml
student: "Ali3"
branch: "Sim S3 Branch wvsr"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T07-13-01/screenshots/5-actor-ca.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T07-13-01/screenshots/5-observer-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T07-13-01/screenshots/5-observer-inst.png`

### Step 6: `approve_pending_payment` as **ca**

```yaml
student: "Ali3"
branch: "Sim S3 Branch wvsr"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T07-13-01/screenshots/6-actor-ca.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T07-13-01/screenshots/6-observer-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T07-13-01/screenshots/6-observer-inst.png`

### Step 7: `stamp_sessions_remaining` as **aa**

```yaml
student: "Ali3"
value: 8
branch: "Sim S3 Branch wvsr"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T07-13-01/screenshots/7-actor-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T07-13-01/screenshots/7-observer-inst.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T07-13-01/screenshots/7-observer-ca.png`

### Step 8: `switch_to_shared` as **aa**

```yaml
student: "Ali3"
branch: "Sim S3 Branch wvsr"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T07-13-01/screenshots/8-actor-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T07-13-01/screenshots/8-observer-inst.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T07-13-01/screenshots/8-observer-ca.png`

## Fixtures

```json
{
  "runId": "wvsrvt",
  "branchId": "b3ef45a7-4060-4cfd-90fa-3070120f3309",
  "branchName": "__sim_wvsrvt_Sim S3 Branch",
  "courseId": "0a829e01-f757-46d7-bb2c-436d1de636c3",
  "courseName": "__sim_wvsrvt_Course3",
  "packageId": "171cdd68-d57f-458e-b63d-4933b8dae7ff",
  "users": [
    {
      "handle": "aa",
      "role": "assistant_admin",
      "id": "996a89ca-bc40-4358-a596-5b8512ed1c88",
      "email": "__sim_wvsrvt_aa@sim.local",
      "profile": "lms-sim-wvsrvt-aa",
      "password": "simpass"
    },
    {
      "handle": "inst",
      "role": "instructor",
      "id": "f9b39505-4270-4d35-9e48-20aa7a8c19ce",
      "email": "__sim_wvsrvt_inst@sim.local",
      "profile": "lms-sim-wvsrvt-inst",
      "password": "simpass"
    },
    {
      "handle": "ca",
      "role": "company_admin",
      "id": "47b969e9-a07e-4306-8183-17bd725a9fba",
      "email": "__sim_wvsrvt_ca@sim.local",
      "profile": "lms-sim-wvsrvt-ca",
      "password": "simpass"
    }
  ],
  "createdVoucherCodes": [],
  "branchCity": "Sim S3 Branch wvsr"
}
```