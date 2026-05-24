# Simulator report — scenario-1-solo-session-auto-renewal

**Run dir:** /Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T10-54-29
**Steps:** 5
**Drift findings:** 0

✅ All checkpoints passed.

## Full checkpoint table

| Step | Role | Field | DOM | DB | Expected | Result |
|------|------|-------|-----|-----|----------|--------|
| 1 | instructor | `/attendance.row_visible(Ali1)` | true | — | true | ✅ |
| 1 | company_admin | `/student.row_visible(Ali1)` | true | — | true | ✅ |
| 2 | assistant_admin | `/student.row_visible(Ali1)` | true | — | true | ✅ |
| 2 | instructor | `/attendance.row_visible(Ali1)` | true | — | true | ✅ |
| 3 | assistant_admin | `/student.row_visible(Ali1)` | true | — | true | ✅ |
| 3 | instructor | `/attendance.row_visible(Ali1)` | true | — | true | ✅ |
| 4 | instructor | `/attendance.row_visible(Ali1)` | true | — | true | ✅ |
| 4 | company_admin | `/student.row_visible(Ali1)` | true | — | true | ✅ |
| 5 | assistant_admin | `/student.row_visible(Ali1)` | true | — | true | ✅ |
| 5 | company_admin | `/student.row_visible(Ali1)` | true | — | true | ✅ |

## Per-step breakdown

### Step 1: `add_student` as **aa**

```yaml
name: "Ali1"
parent_name: "S1 Parent"
parent_email: "p1@sim.local"
parent_phone: "0123450010"
course: "__sim_6toccl_S1Course"
package: "4-session"
date_of_birth: "2015-01-01"
gender: "male"
school_name: "Sim School"
branch: "Sim S1 Branch 6toc"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T10-54-29/screenshots/1-actor-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T10-54-29/screenshots/1-observer-inst.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T10-54-29/screenshots/1-observer-ca.png`

### Step 2: `mark_offline_paid` as **ca**

```yaml
student: "Ali1"
branch: "Sim S1 Branch 6toc"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T10-54-29/screenshots/2-actor-ca.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T10-54-29/screenshots/2-observer-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T10-54-29/screenshots/2-observer-inst.png`

### Step 3: `approve_pending_payment` as **ca**

```yaml
student: "Ali1"
branch: "Sim S1 Branch 6toc"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T10-54-29/screenshots/3-actor-ca.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T10-54-29/screenshots/3-observer-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T10-54-29/screenshots/3-observer-inst.png`

### Step 4: `stamp_sessions_remaining` as **aa**

```yaml
student: "Ali1"
value: 1
branch: "Sim S1 Branch 6toc"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T10-54-29/screenshots/4-actor-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T10-54-29/screenshots/4-observer-inst.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T10-54-29/screenshots/4-observer-ca.png`

### Step 5: `mark_present` as **inst**

```yaml
student: "Ali1"
lesson: "Lesson 1"
mission: "Level 1"
activity: "intro"
branch: "Sim S1 Branch 6toc"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T10-54-29/screenshots/5-actor-inst.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T10-54-29/screenshots/5-observer-aa.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T10-54-29/screenshots/5-observer-ca.png`

## Fixtures

```json
{
  "runId": "6toccl",
  "branchId": "8190f357-27cc-4fb6-89e0-0f7cb940e130",
  "branchName": "__sim_6toccl_Sim S1 Branch",
  "courseId": "31b7bacc-4949-4066-a281-cc19732ba320",
  "courseName": "__sim_6toccl_S1Course",
  "packageId": "ea73e032-008e-4197-8882-2dafbca407a5",
  "users": [
    {
      "handle": "aa",
      "role": "assistant_admin",
      "id": "f42fdb6f-07f8-47ab-9a7c-b2a73313f1d7",
      "email": "__sim_6toccl_aa@sim.local",
      "profile": "lms-sim-6toccl-aa",
      "password": "simpass"
    },
    {
      "handle": "inst",
      "role": "instructor",
      "id": "b5bed41f-9423-4cb5-8bfd-2dee7d8972cc",
      "email": "__sim_6toccl_inst@sim.local",
      "profile": "lms-sim-6toccl-inst",
      "password": "simpass"
    },
    {
      "handle": "ca",
      "role": "company_admin",
      "id": "6831bab1-a8e0-460d-8071-b25c7ea8d939",
      "email": "__sim_6toccl_ca@sim.local",
      "profile": "lms-sim-6toccl-ca",
      "password": "simpass"
    }
  ],
  "createdVoucherCodes": [],
  "branchCity": "Sim S1 Branch 6toc"
}
```