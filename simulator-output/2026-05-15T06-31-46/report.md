# Simulator report — scenario-8c-individual-to-shared-negative

**Run dir:** /Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T06-31-46
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
course: "__sim_liljs6_Course8c"
package: "4-session"
date_of_birth: "2016-02-10"
gender: "male"
school_name: "Sim School"
branch: "Sim 8c Branch lilj"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T06-31-46/screenshots/1-actor-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T06-31-46/screenshots/1-observer-inst.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T06-31-46/screenshots/1-observer-ca.png`

### Step 2: `add_student` as **aa**

```yaml
name: "Ali8c"
parent_email: "p8c@sim.local"
parent_existing: true
course: "__sim_liljs6_Course8c"
package: "4-session"
force_individual: true
date_of_birth: "2014-03-05"
gender: "male"
school_name: "Sim School"
branch: "Sim 8c Branch lilj"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T06-31-46/screenshots/2-actor-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T06-31-46/screenshots/2-observer-inst.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T06-31-46/screenshots/2-observer-ca.png`

### Step 3: `mark_present` as **inst**

```yaml
student: "Ali8c"
lesson: "Lesson 1"
mission: "Level 1"
activity: "intro"
branch: "Sim 8c Branch lilj"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T06-31-46/screenshots/3-actor-inst.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T06-31-46/screenshots/3-observer-aa.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T06-31-46/screenshots/3-observer-ca.png`

### Step 4: `switch_to_shared` as **aa**

```yaml
student: "Ali8c"
branch: "Sim 8c Branch lilj"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T06-31-46/screenshots/4-actor-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T06-31-46/screenshots/4-observer-inst.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T06-31-46/screenshots/4-observer-ca.png`

### Step 5: `mark_offline_paid` as **ca**

```yaml
student: "Ali8c"
branch: "Sim 8c Branch lilj"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T06-31-46/screenshots/5-actor-ca.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T06-31-46/screenshots/5-observer-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T06-31-46/screenshots/5-observer-inst.png`

### Step 6: `approve_pending_payment` as **ca**

```yaml
student: "Ali8c"
branch: "Sim 8c Branch lilj"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T06-31-46/screenshots/6-actor-ca.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T06-31-46/screenshots/6-observer-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T06-31-46/screenshots/6-observer-inst.png`

## Fixtures

```json
{
  "runId": "liljs6",
  "branchId": "a751e206-47e9-4070-bc38-9abf8073bf3d",
  "branchName": "__sim_liljs6_Sim 8c Branch",
  "courseId": "e21f5610-5e64-498a-91d3-33bdb7b99cdc",
  "courseName": "__sim_liljs6_Course8c",
  "packageId": "30197891-666c-44cc-be5a-7ed6062d25cb",
  "users": [
    {
      "handle": "aa",
      "role": "assistant_admin",
      "id": "ab04ccfa-743b-4868-ad91-fc1493855c20",
      "email": "__sim_liljs6_aa@sim.local",
      "profile": "lms-sim-liljs6-aa",
      "password": "simpass"
    },
    {
      "handle": "inst",
      "role": "instructor",
      "id": "ddd29d45-3592-4935-9f9f-ebb822953a14",
      "email": "__sim_liljs6_inst@sim.local",
      "profile": "lms-sim-liljs6-inst",
      "password": "simpass"
    },
    {
      "handle": "ca",
      "role": "company_admin",
      "id": "f4d56d13-8a92-4b53-936b-b20e4d6b5ff9",
      "email": "__sim_liljs6_ca@sim.local",
      "profile": "lms-sim-liljs6-ca",
      "password": "simpass"
    }
  ],
  "createdVoucherCodes": [],
  "branchCity": "Sim 8c Branch lilj"
}
```