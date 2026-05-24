# Simulator report — scenario-8b-pool-dissolution

**Run dir:** /Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T07-20-23
**Steps:** 3
**Drift findings:** 0

✅ All checkpoints passed.

## Full checkpoint table

| Step | Role | Field | DOM | DB | Expected | Result |
|------|------|-------|-----|-----|----------|--------|
| 1 | instructor | `/attendance.row_visible(Abu8b)` | true | — | true | ✅ |
| 1 | company_admin | `/student.row_visible(Abu8b)` | true | — | true | ✅ |
| 2 | instructor | `/attendance.row_visible(Ali8b)` | true | — | true | ✅ |
| 2 | company_admin | `/student.row_visible(Ali8b)` | true | — | true | ✅ |
| 3 | instructor | `/attendance.row_visible(Ali8b)` | true | — | true | ✅ |
| 3 | instructor | `enrollment.pool_id_set` | — | false | false | ✅ |
| 3 | instructor | `pending_payments_table.row_visible` | — | true | true | ✅ |
| 3 | company_admin | `/student.row_visible(Ali8b)` | true | — | true | ✅ |
| 3 | company_admin | `enrollment.pool_id_set` | — | false | false | ✅ |
| 3 | company_admin | `pending_payments_table.row_visible` | — | true | true | ✅ |

## Per-step breakdown

### Step 1: `add_student` as **aa**

```yaml
name: "Abu8b"
parent_name: "S8b Parent"
parent_email: "p8b@sim.local"
parent_phone: "0123450082"
course: "__sim_asqqla_Course8b"
package: "4-session"
date_of_birth: "2016-02-10"
gender: "male"
school_name: "Sim School"
branch: "Sim S8b Branch asqq"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T07-20-23/screenshots/1-actor-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T07-20-23/screenshots/1-observer-inst.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T07-20-23/screenshots/1-observer-ca.png`

### Step 2: `add_student` as **aa**

```yaml
name: "Ali8b"
parent_email: "p8b@sim.local"
parent_existing: true
course: "__sim_asqqla_Course8b"
share_with_sibling: true
date_of_birth: "2014-03-05"
gender: "male"
school_name: "Sim School"
branch: "Sim S8b Branch asqq"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T07-20-23/screenshots/2-actor-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T07-20-23/screenshots/2-observer-inst.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T07-20-23/screenshots/2-observer-ca.png`

### Step 3: `switch_to_individual` as **aa**

```yaml
student: "Ali8b"
branch: "Sim S8b Branch asqq"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T07-20-23/screenshots/3-actor-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T07-20-23/screenshots/3-observer-inst.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T07-20-23/screenshots/3-observer-ca.png`

## Fixtures

```json
{
  "runId": "asqqla",
  "branchId": "b284cccb-6476-4353-ad9c-5e16172d5df7",
  "branchName": "__sim_asqqla_Sim S8b Branch",
  "courseId": "289bed9b-94a5-45b5-9424-bbbbc1f00741",
  "courseName": "__sim_asqqla_Course8b",
  "packageId": "02cba109-d5d1-4b75-aa8d-137f03c239b7",
  "users": [
    {
      "handle": "aa",
      "role": "assistant_admin",
      "id": "15dc1c86-c282-4228-8fad-f6d58d0196bc",
      "email": "__sim_asqqla_aa@sim.local",
      "profile": "lms-sim-asqqla-aa",
      "password": "simpass"
    },
    {
      "handle": "inst",
      "role": "instructor",
      "id": "af4e749d-ea7c-4b82-822e-567ea908d25d",
      "email": "__sim_asqqla_inst@sim.local",
      "profile": "lms-sim-asqqla-inst",
      "password": "simpass"
    },
    {
      "handle": "ca",
      "role": "company_admin",
      "id": "fbe9a238-097d-4831-8235-97c351fce26b",
      "email": "__sim_asqqla_ca@sim.local",
      "profile": "lms-sim-asqqla-ca",
      "password": "simpass"
    }
  ],
  "createdVoucherCodes": [],
  "branchCity": "Sim S8b Branch asqq"
}
```