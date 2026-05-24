# Simulator report — scenario-11-13-voucher-earn-and-redeem

**Run dir:** /Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-17T13-33-38
**Steps:** 6
**Drift findings:** 0

✅ All checkpoints passed.

## Full checkpoint table

| Step | Role | Field | DOM | DB | Expected | Result |
|------|------|-------|-----|-----|----------|--------|
| 1 | instructor | `/attendance.row_visible(Ali11)` | true | — | true | ✅ |
| 1 | company_admin | `/student.row_visible(Ali11)` | true | — | true | ✅ |
| 2 | assistant_admin | `/student.row_visible(Ali11)` | true | — | true | ✅ |
| 2 | instructor | `/attendance.row_visible(Ali11)` | true | — | true | ✅ |
| 3 | assistant_admin | `/student.row_visible(Ali11)` | true | — | true | ✅ |
| 3 | instructor | `/attendance.row_visible(Ali11)` | true | — | true | ✅ |
| 4 | assistant_admin | `/student.row_visible(Ali11)` | true | — | true | ✅ |
| 4 | assistant_admin | `voucher.available_count` | — | 1 | 1 | ✅ |
| 4 | assistant_admin | `voucher.total_amount_available` | — | 50 | 50 | ✅ |
| 4 | assistant_admin | `pending_payments_table.row_visible` | — | true | true | ✅ |
| 4 | company_admin | `/student.row_visible(Ali11)` | true | — | true | ✅ |
| 4 | company_admin | `voucher.available_count` | — | 1 | 1 | ✅ |
| 4 | company_admin | `voucher.total_amount_available` | — | 50 | 50 | ✅ |
| 4 | company_admin | `pending_payments_table.row_visible` | — | true | true | ✅ |
| 5 | assistant_admin | `/student.row_visible(Ali11)` | true | — | true | ✅ |
| 5 | instructor | `/attendance.row_visible(Ali11)` | false | — | false | ✅ |
| 6 | assistant_admin | `/student.row_visible(Ali11)` | true | — | true | ✅ |
| 6 | assistant_admin | `voucher.available_count` | — | 0 | 0 | ✅ |
| 6 | assistant_admin | `voucher.redeemed_count` | — | 1 | 1 | ✅ |
| 6 | instructor | `/attendance.row_visible(Ali11)` | false | — | false | ✅ |
| 6 | instructor | `voucher.available_count` | — | 0 | 0 | ✅ |
| 6 | instructor | `voucher.redeemed_count` | — | 1 | 1 | ✅ |

## Per-step breakdown

### Step 1: `add_student` as **aa**

```yaml
name: "Ali11"
parent_name: "S11 Parent"
parent_email: "p11@sim.local"
parent_phone: "0123450110"
course: "__sim_1g230z_Course11"
package: "1-session"
date_of_birth: "2015-01-01"
gender: "male"
school_name: "Sim School"
branch: "Sim S11 Branch 1g23"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-17T13-33-38/screenshots/1-actor-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-17T13-33-38/screenshots/1-observer-inst.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-17T13-33-38/screenshots/1-observer-ca.png`

### Step 2: `mark_offline_paid` as **ca**

```yaml
student: "Ali11"
branch: "Sim S11 Branch 1g23"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-17T13-33-38/screenshots/2-actor-ca.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-17T13-33-38/screenshots/2-observer-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-17T13-33-38/screenshots/2-observer-inst.png`

### Step 3: `approve_pending_payment` as **ca**

```yaml
student: "Ali11"
branch: "Sim S11 Branch 1g23"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-17T13-33-38/screenshots/3-actor-ca.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-17T13-33-38/screenshots/3-observer-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-17T13-33-38/screenshots/3-observer-inst.png`

### Step 4: `mark_present` as **inst**

```yaml
student: "Ali11"
lesson: "Lesson 1"
mission: "Level 1"
activity: "earn-voucher session"
branch: "Sim S11 Branch 1g23"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-17T13-33-38/screenshots/4-actor-inst.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-17T13-33-38/screenshots/4-observer-aa.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-17T13-33-38/screenshots/4-observer-ca.png`

### Step 5: `mark_offline_paid` as **ca**

```yaml
student: "Ali11"
branch: "Sim S11 Branch 1g23"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-17T13-33-38/screenshots/5-actor-ca.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-17T13-33-38/screenshots/5-observer-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-17T13-33-38/screenshots/5-observer-inst.png`

### Step 6: `approve_pending_payment` as **ca**

```yaml
student: "Ali11"
branch: "Sim S11 Branch 1g23"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-17T13-33-38/screenshots/6-actor-ca.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-17T13-33-38/screenshots/6-observer-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-17T13-33-38/screenshots/6-observer-inst.png`

## Fixtures

```json
{
  "runId": "1g230z",
  "branchId": "b52f1159-2248-4e51-aa59-eb0345635154",
  "branchName": "__sim_1g230z_Sim S11 Branch",
  "courseId": "6d0f511d-9d36-4b5f-9de6-09f75585bc13",
  "courseName": "__sim_1g230z_Course11",
  "packageId": "d8ba2147-981d-4aa0-b802-df807df7ef36",
  "users": [
    {
      "handle": "aa",
      "role": "assistant_admin",
      "id": "fa5b2fb4-5205-4bf2-8317-ccc81c8b7f56",
      "email": "__sim_1g230z_aa@sim.local",
      "profile": "lms-sim-1g230z-aa",
      "password": "simpass"
    },
    {
      "handle": "inst",
      "role": "instructor",
      "id": "19faa6a1-d437-4bba-af90-a54fba8952a0",
      "email": "__sim_1g230z_inst@sim.local",
      "profile": "lms-sim-1g230z-inst",
      "password": "simpass"
    },
    {
      "handle": "ca",
      "role": "company_admin",
      "id": "e0ca0106-e613-426b-a11f-610aeba7f4ac",
      "email": "__sim_1g230z_ca@sim.local",
      "profile": "lms-sim-1g230z-ca",
      "password": "simpass"
    }
  ],
  "createdVoucherCodes": [],
  "branchCity": "Sim S11 Branch 1g23"
}
```