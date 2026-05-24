# Simulator report — scenario-8c-individual-to-shared-negative

**Run dir:** /Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T09-20-02
**Steps:** 6
**Drift findings:** 0

✅ All checkpoints passed.

## Full checkpoint table

| Step | Role | Field | DOM | DB | Expected | Result |
|------|------|-------|-----|-----|----------|--------|
| 1 | instructor | `/attendance.row_visible(Abu8c)` | true | — | true | ✅ |
| 1 | company_admin | `/student.row_visible(Abu8c)` | true | — | true | ✅ |
| 2 | instructor | `/attendance.row_visible(Ali8c)` | true | — | true | ✅ |
| 2 | company_admin | `/student.row_visible(Ali8c)` | true | — | true | ✅ |
| 3 | assistant_admin | `/student.row_visible(Ali8c)` | true | — | true | ✅ |
| 3 | company_admin | `/student.row_visible(Ali8c)` | true | — | true | ✅ |
| 4 | instructor | `/attendance.row_visible(Ali8c)` | false | — | false | ✅ |
| 4 | company_admin | `/student.row_visible(Ali8c)` | true | — | true | ✅ |
| 5 | assistant_admin | `/student.row_visible(Ali8c)` | true | — | true | ✅ |
| 5 | instructor | `/attendance.row_visible(Ali8c)` | false | — | false | ✅ |
| 6 | assistant_admin | `/student.row_visible(Ali8c)` | true | — | true | ✅ |
| 6 | instructor | `/attendance.row_visible(Ali8c)` | false | — | false | ✅ |

## Per-step breakdown

### Step 1: `add_student` as **aa**

```yaml
name: "Abu8c"
parent_name: "8c Parent"
parent_email: "p8c@sim.local"
parent_phone: "0123450080"
course: "__sim_kzy6ux_Course8c"
package: "4-session"
date_of_birth: "2016-02-10"
gender: "male"
school_name: "Sim School"
branch: "Sim 8c Branch kzy6"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T09-20-02/screenshots/1-actor-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T09-20-02/screenshots/1-observer-inst.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T09-20-02/screenshots/1-observer-ca.png`

### Step 2: `add_student` as **aa**

```yaml
name: "Ali8c"
parent_email: "p8c@sim.local"
parent_existing: true
course: "__sim_kzy6ux_Course8c"
package: "4-session"
force_individual: true
date_of_birth: "2014-03-05"
gender: "male"
school_name: "Sim School"
branch: "Sim 8c Branch kzy6"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T09-20-02/screenshots/2-actor-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T09-20-02/screenshots/2-observer-inst.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T09-20-02/screenshots/2-observer-ca.png`

### Step 3: `mark_present` as **inst**

```yaml
student: "Ali8c"
lesson: "Lesson 1"
mission: "Level 1"
activity: "intro"
branch: "Sim 8c Branch kzy6"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T09-20-02/screenshots/3-actor-inst.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T09-20-02/screenshots/3-observer-aa.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T09-20-02/screenshots/3-observer-ca.png`

### Step 4: `switch_to_shared` as **aa**

```yaml
student: "Ali8c"
branch: "Sim 8c Branch kzy6"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T09-20-02/screenshots/4-actor-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T09-20-02/screenshots/4-observer-inst.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T09-20-02/screenshots/4-observer-ca.png`

### Step 5: `mark_offline_paid` as **ca**

```yaml
student: "Ali8c"
branch: "Sim 8c Branch kzy6"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T09-20-02/screenshots/5-actor-ca.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T09-20-02/screenshots/5-observer-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T09-20-02/screenshots/5-observer-inst.png`

### Step 6: `approve_pending_payment` as **ca**

```yaml
student: "Ali8c"
branch: "Sim 8c Branch kzy6"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T09-20-02/screenshots/6-actor-ca.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T09-20-02/screenshots/6-observer-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T09-20-02/screenshots/6-observer-inst.png`

## Fixtures

```json
{
  "runId": "kzy6ux",
  "branchId": "fd3a51c1-9bd8-4d1f-aa9c-794012b23e8f",
  "branchName": "__sim_kzy6ux_Sim 8c Branch",
  "courseId": "f9f6e9a5-8a35-45ce-938f-de1e2b05cd8e",
  "courseName": "__sim_kzy6ux_Course8c",
  "packageId": "4578f126-2be4-4850-8da5-ba5a3f652631",
  "users": [
    {
      "handle": "aa",
      "role": "assistant_admin",
      "id": "ba56ab13-ce34-408b-84d6-9d7690e28a3c",
      "email": "__sim_kzy6ux_aa@sim.local",
      "profile": "lms-sim-kzy6ux-aa",
      "password": "simpass"
    },
    {
      "handle": "inst",
      "role": "instructor",
      "id": "d89390b5-5e6b-482d-8bff-47372ed6e11e",
      "email": "__sim_kzy6ux_inst@sim.local",
      "profile": "lms-sim-kzy6ux-inst",
      "password": "simpass"
    },
    {
      "handle": "ca",
      "role": "company_admin",
      "id": "5e3b98a5-bc71-447a-988e-38a0a468e812",
      "email": "__sim_kzy6ux_ca@sim.local",
      "profile": "lms-sim-kzy6ux-ca",
      "password": "simpass"
    }
  ],
  "createdVoucherCodes": [],
  "branchCity": "Sim 8c Branch kzy6"
}
```