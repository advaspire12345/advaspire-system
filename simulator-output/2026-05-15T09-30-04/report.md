# Simulator report — scenario-10-three-sibling-positive-pool

**Run dir:** /Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T09-30-04
**Steps:** 6
**Drift findings:** 0

✅ All checkpoints passed.

## Full checkpoint table

| Step | Role | Field | DOM | DB | Expected | Result |
|------|------|-------|-----|-----|----------|--------|
| 1 | instructor | `/attendance.row_visible(Ali10)` | true | — | true | ✅ |
| 1 | company_admin | `/student.row_visible(Ali10)` | true | — | true | ✅ |
| 2 | instructor | `/attendance.row_visible(Abu10)` | true | — | true | ✅ |
| 2 | company_admin | `/student.row_visible(Abu10)` | true | — | true | ✅ |
| 3 | instructor | `/attendance.row_visible(Aminah10)` | true | — | true | ✅ |
| 3 | company_admin | `/student.row_visible(Aminah10)` | true | — | true | ✅ |
| 4 | assistant_admin | `/student.row_visible(Ali10)` | true | — | true | ✅ |
| 4 | instructor | `/attendance.row_visible(Ali10)` | true | — | true | ✅ |
| 5 | assistant_admin | `/student.row_visible(Ali10)` | true | — | true | ✅ |
| 5 | assistant_admin | `pool.sessions_remaining` | — | 12 | 12 | ✅ |
| 5 | assistant_admin | `pool.active_students` | — | 3 | 3 | ✅ |
| 5 | assistant_admin | `enrollment.sessions_remaining` | — | 0 | 0 | ✅ |
| 5 | instructor | `/attendance.row_visible(Ali10)` | true | — | true | ✅ |
| 5 | instructor | `pool.sessions_remaining` | — | 12 | 12 | ✅ |
| 5 | instructor | `pool.active_students` | — | 3 | 3 | ✅ |
| 5 | instructor | `enrollment.sessions_remaining` | — | 0 | 0 | ✅ |
| 6 | assistant_admin | `/student.row_visible(Abu10)` | true | — | true | ✅ |
| 6 | assistant_admin | `pool.sessions_remaining` | — | 11 | 11 | ✅ |
| 6 | assistant_admin | `pool.active_students` | — | 3 | 3 | ✅ |
| 6 | assistant_admin | `enrollment.sessions_remaining` | — | 0 | 0 | ✅ |
| 6 | company_admin | `/student.row_visible(Abu10)` | true | — | true | ✅ |
| 6 | company_admin | `pool.sessions_remaining` | — | 11 | 11 | ✅ |
| 6 | company_admin | `pool.active_students` | — | 3 | 3 | ✅ |
| 6 | company_admin | `enrollment.sessions_remaining` | — | 0 | 0 | ✅ |

## Per-step breakdown

### Step 1: `add_student` as **aa**

```yaml
name: "Ali10"
parent_name: "S10 Parent"
parent_email: "p10@sim.local"
parent_phone: "0123450100"
course: "__sim_q6dz4s_Course10"
package: "12-session"
date_of_birth: "2015-01-01"
gender: "male"
school_name: "Sim School"
branch: "Sim S10 Branch q6dz"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T09-30-04/screenshots/1-actor-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T09-30-04/screenshots/1-observer-inst.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T09-30-04/screenshots/1-observer-ca.png`

### Step 2: `add_student` as **aa**

```yaml
name: "Abu10"
parent_email: "p10@sim.local"
parent_existing: true
course: "__sim_q6dz4s_Course10"
share_with_sibling: true
date_of_birth: "2017-01-01"
gender: "male"
school_name: "Sim School"
branch: "Sim S10 Branch q6dz"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T09-30-04/screenshots/2-actor-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T09-30-04/screenshots/2-observer-inst.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T09-30-04/screenshots/2-observer-ca.png`

### Step 3: `add_student` as **aa**

```yaml
name: "Aminah10"
parent_email: "p10@sim.local"
parent_existing: true
course: "__sim_q6dz4s_Course10"
share_with_sibling: true
date_of_birth: "2019-01-01"
gender: "female"
school_name: "Sim School"
branch: "Sim S10 Branch q6dz"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T09-30-04/screenshots/3-actor-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T09-30-04/screenshots/3-observer-inst.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T09-30-04/screenshots/3-observer-ca.png`

### Step 4: `mark_offline_paid` as **ca**

```yaml
student: "Ali10"
branch: "Sim S10 Branch q6dz"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T09-30-04/screenshots/4-actor-ca.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T09-30-04/screenshots/4-observer-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T09-30-04/screenshots/4-observer-inst.png`

### Step 5: `approve_pending_payment` as **ca**

```yaml
student: "Ali10"
branch: "Sim S10 Branch q6dz"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T09-30-04/screenshots/5-actor-ca.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T09-30-04/screenshots/5-observer-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T09-30-04/screenshots/5-observer-inst.png`

### Step 6: `mark_present` as **inst**

```yaml
student: "Abu10"
lesson: "Lesson 1"
mission: "Level 1"
activity: "intro"
branch: "Sim S10 Branch q6dz"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T09-30-04/screenshots/6-actor-inst.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T09-30-04/screenshots/6-observer-aa.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T09-30-04/screenshots/6-observer-ca.png`

## Fixtures

```json
{
  "runId": "q6dz4s",
  "branchId": "656c5646-83ae-466a-87a4-89f0efeb5ff9",
  "branchName": "__sim_q6dz4s_Sim S10 Branch",
  "courseId": "9e0e6659-c3a0-4027-bd1c-385753b09672",
  "courseName": "__sim_q6dz4s_Course10",
  "packageId": "222f7530-3cf2-4d04-b77a-dfd10412a11f",
  "users": [
    {
      "handle": "aa",
      "role": "assistant_admin",
      "id": "cf633e12-8945-4499-a389-2ef8926b4236",
      "email": "__sim_q6dz4s_aa@sim.local",
      "profile": "lms-sim-q6dz4s-aa",
      "password": "simpass"
    },
    {
      "handle": "inst",
      "role": "instructor",
      "id": "5fe66644-76c7-49c6-959d-20ef1e0abc90",
      "email": "__sim_q6dz4s_inst@sim.local",
      "profile": "lms-sim-q6dz4s-inst",
      "password": "simpass"
    },
    {
      "handle": "ca",
      "role": "company_admin",
      "id": "20f375bd-5a06-452a-bfd7-5fb2b555cb2d",
      "email": "__sim_q6dz4s_ca@sim.local",
      "profile": "lms-sim-q6dz4s-ca",
      "password": "simpass"
    }
  ],
  "createdVoucherCodes": [],
  "branchCity": "Sim S10 Branch q6dz"
}
```