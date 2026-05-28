# Simulator report — examination-pass-bumps-level

**Run dir:** /Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-28T09-11-18
**Steps:** 5
**Drift findings:** 0

✅ All checkpoints passed.

## Full checkpoint table

| Step | Role | Field | DOM | DB | Expected | Result |
|------|------|-------|-----|-----|----------|--------|
| 1 | instructor | `/attendance.row_visible(Bryan)` | true | — | true | ✅ |
| 1 | company_admin | `/student.row_visible(Bryan)` | true | — | true | ✅ |
| 2 | assistant_admin | `/student.row_visible(Bryan)` | true | — | true | ✅ |
| 2 | instructor | `/attendance.row_visible(Bryan)` | true | — | true | ✅ |
| 3 | assistant_admin | `/student.row_visible(Bryan)` | true | — | true | ✅ |
| 3 | instructor | `/attendance.row_visible(Bryan)` | true | — | true | ✅ |
| 4 | assistant_admin | `/student.row_visible(Bryan)` | true | — | true | ✅ |
| 4 | company_admin | `/student.row_visible(Bryan)` | true | — | true | ✅ |
| 5 | assistant_admin | `/student.row_visible(Bryan)` | true | — | true | ✅ |
| 5 | instructor | `/attendance.row_visible(Bryan)` | false | — | false | ✅ |

## Per-step breakdown

### Step 1: `add_student` as **aa**

```yaml
name: "Bryan"
parent_name: "Pass Parent"
parent_email: "passp@sim.local"
parent_phone: "0123450097"
course: "__sim_k3jxjt_PassCourse"
package: "4-session"
date_of_birth: "2015-01-01"
gender: "male"
school_name: "Sim School"
branch: "Sim Pass Branch k3jx"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-28T09-11-18/screenshots/1-actor-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-28T09-11-18/screenshots/1-observer-inst.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-28T09-11-18/screenshots/1-observer-ca.png`

### Step 2: `mark_offline_paid` as **ca**

```yaml
student: "Bryan"
branch: "Sim Pass Branch k3jx"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-28T09-11-18/screenshots/2-actor-ca.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-28T09-11-18/screenshots/2-observer-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-28T09-11-18/screenshots/2-observer-inst.png`

### Step 3: `approve_pending_payment` as **ca**

```yaml
student: "Bryan"
branch: "Sim Pass Branch k3jx"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-28T09-11-18/screenshots/3-actor-ca.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-28T09-11-18/screenshots/3-observer-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-28T09-11-18/screenshots/3-observer-inst.png`

### Step 4: `mark_present` as **inst**

```yaml
student: "Bryan"
lesson: "Lesson 1"
mission: "Level 1"
activity: "intro"
branch: "Sim Pass Branch k3jx"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-28T09-11-18/screenshots/4-actor-inst.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-28T09-11-18/screenshots/4-observer-aa.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-28T09-11-18/screenshots/4-observer-ca.png`

### Step 5: `mark_exam_decision` as **ca**

```yaml
student: "Bryan"
decision: "pass"
mark: 85
branch: "Sim Pass Branch k3jx"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-28T09-11-18/screenshots/5-actor-ca.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-28T09-11-18/screenshots/5-observer-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-28T09-11-18/screenshots/5-observer-inst.png`

## Fixtures

```json
{
  "runId": "k3jxjt",
  "branchId": "264c35a8-f326-414d-93b8-6e4cf6e08850",
  "branchName": "__sim_k3jxjt_Sim Pass Branch",
  "courseId": "22216462-e864-4789-b29c-aafdd90a7467",
  "courseName": "__sim_k3jxjt_PassCourse",
  "packageId": "969b6393-e781-4531-b268-9b0c51553450",
  "users": [
    {
      "handle": "aa",
      "role": "assistant_admin",
      "id": "68f77aff-eb21-4309-a794-d56d0f5aac23",
      "email": "__sim_k3jxjt_aa@sim.local",
      "profile": "lms-sim-k3jxjt-aa",
      "password": "simpass"
    },
    {
      "handle": "inst",
      "role": "instructor",
      "id": "99c1fb10-7c23-432f-92db-4941ec4d73bf",
      "email": "__sim_k3jxjt_inst@sim.local",
      "profile": "lms-sim-k3jxjt-inst",
      "password": "simpass"
    },
    {
      "handle": "ca",
      "role": "company_admin",
      "id": "2a050ff6-3e34-4212-b0c6-726a49ce3213",
      "email": "__sim_k3jxjt_ca@sim.local",
      "profile": "lms-sim-k3jxjt-ca",
      "password": "simpass"
    }
  ],
  "createdVoucherCodes": [],
  "branchCity": "Sim Pass Branch k3jx"
}
```