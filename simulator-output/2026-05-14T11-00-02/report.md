# Simulator report — scenario-2-monthly-package

**Run dir:** /Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T11-00-02
**Steps:** 5
**Drift findings:** 0

✅ All checkpoints passed.

## Full checkpoint table

| Step | Role | Field | DOM | DB | Expected | Result |
|------|------|-------|-----|-----|----------|--------|
| 1 | instructor | `/attendance.row_visible(Ali2)` | true | — | true | ✅ |
| 1 | company_admin | `/student.row_visible(Ali2)` | true | — | true | ✅ |
| 2 | assistant_admin | `/student.row_visible(Ali2)` | true | — | true | ✅ |
| 2 | instructor | `/attendance.row_visible(Ali2)` | true | — | true | ✅ |
| 3 | assistant_admin | `/student.row_visible(Ali2)` | true | — | true | ✅ |
| 3 | instructor | `/attendance.row_visible(Ali2)` | true | — | true | ✅ |
| 4 | instructor | `/attendance.row_visible(Ali2)` | true | — | true | ✅ |
| 4 | company_admin | `/student.row_visible(Ali2)` | true | — | true | ✅ |
| 5 | assistant_admin | `/student.row_visible(Ali2)` | true | — | true | ✅ |
| 5 | company_admin | `/student.row_visible(Ali2)` | true | — | true | ✅ |

## Per-step breakdown

### Step 1: `add_student` as **aa**

```yaml
name: "Ali2"
parent_name: "S2 Parent"
parent_email: "p2@sim.local"
parent_phone: "0123450020"
course: "__sim_wm4e79_S2Course"
package: "1-monthly"
date_of_birth: "2015-01-01"
gender: "male"
school_name: "Sim School"
branch: "Sim S2 Branch wm4e"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T11-00-02/screenshots/1-actor-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T11-00-02/screenshots/1-observer-inst.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T11-00-02/screenshots/1-observer-ca.png`

### Step 2: `mark_offline_paid` as **ca**

```yaml
student: "Ali2"
branch: "Sim S2 Branch wm4e"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T11-00-02/screenshots/2-actor-ca.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T11-00-02/screenshots/2-observer-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T11-00-02/screenshots/2-observer-inst.png`

### Step 3: `approve_pending_payment` as **ca**

```yaml
student: "Ali2"
branch: "Sim S2 Branch wm4e"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T11-00-02/screenshots/3-actor-ca.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T11-00-02/screenshots/3-observer-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T11-00-02/screenshots/3-observer-inst.png`

### Step 4: `stamp_sessions_remaining` as **aa**

```yaml
student: "Ali2"
value: 1
branch: "Sim S2 Branch wm4e"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T11-00-02/screenshots/4-actor-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T11-00-02/screenshots/4-observer-inst.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T11-00-02/screenshots/4-observer-ca.png`

### Step 5: `mark_present` as **inst**

```yaml
student: "Ali2"
lesson: "Lesson 1"
mission: "Level 1"
activity: "intro"
branch: "Sim S2 Branch wm4e"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T11-00-02/screenshots/5-actor-inst.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T11-00-02/screenshots/5-observer-aa.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T11-00-02/screenshots/5-observer-ca.png`

## Fixtures

```json
{
  "runId": "wm4e79",
  "branchId": "8f8396b2-54d7-4460-ab09-4dc9851b6fa9",
  "branchName": "__sim_wm4e79_Sim S2 Branch",
  "courseId": "eace0499-2065-4a0b-8462-c9e6f786333c",
  "courseName": "__sim_wm4e79_S2Course",
  "packageId": "4c6cb8dc-8cd2-4554-bf8e-62d84283bc1d",
  "users": [
    {
      "handle": "aa",
      "role": "assistant_admin",
      "id": "07b8dfdd-ac2e-4931-9c8e-0ddf34e21a1b",
      "email": "__sim_wm4e79_aa@sim.local",
      "profile": "lms-sim-wm4e79-aa",
      "password": "simpass"
    },
    {
      "handle": "inst",
      "role": "instructor",
      "id": "087fc56d-4618-4330-a8d1-e37a33d7297d",
      "email": "__sim_wm4e79_inst@sim.local",
      "profile": "lms-sim-wm4e79-inst",
      "password": "simpass"
    },
    {
      "handle": "ca",
      "role": "company_admin",
      "id": "a8b64caa-2235-4fb4-8cbd-1eb3229c008b",
      "email": "__sim_wm4e79_ca@sim.local",
      "profile": "lms-sim-wm4e79-ca",
      "password": "simpass"
    }
  ],
  "createdVoucherCodes": [],
  "branchCity": "Sim S2 Branch wm4e"
}
```