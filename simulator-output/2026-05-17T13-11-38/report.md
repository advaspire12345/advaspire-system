# Simulator report — scenario-11-13-voucher-earn-and-redeem

**Run dir:** /Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-17T13-11-38
**Steps:** 6
**Drift findings:** 6

## ❌ Drift / failure findings

| Step | Role | Field | DOM | DB | Expected | Result |
|------|------|-------|-----|-----|----------|--------|
| 4 | assistant_admin | `voucher.available_count` | — | 0 | 1 | ❌ DB_FAIL |
| 4 | assistant_admin | `voucher.total_amount_available` | — | 0 | 50 | ❌ DB_FAIL |
| 4 | company_admin | `voucher.available_count` | — | 0 | 1 | ❌ DB_FAIL |
| 4 | company_admin | `voucher.total_amount_available` | — | 0 | 50 | ❌ DB_FAIL |
| 6 | assistant_admin | `voucher.redeemed_count` | — | 0 | 1 | ❌ DB_FAIL |
| 6 | instructor | `voucher.redeemed_count` | — | 0 | 1 | ❌ DB_FAIL |

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
| 4 | assistant_admin | `voucher.available_count` | — | 0 | 1 | ❌ DB_FAIL |
| 4 | assistant_admin | `voucher.total_amount_available` | — | 0 | 50 | ❌ DB_FAIL |
| 4 | assistant_admin | `pending_payments_table.row_visible` | — | true | true | ✅ |
| 4 | company_admin | `/student.row_visible(Ali11)` | true | — | true | ✅ |
| 4 | company_admin | `voucher.available_count` | — | 0 | 1 | ❌ DB_FAIL |
| 4 | company_admin | `voucher.total_amount_available` | — | 0 | 50 | ❌ DB_FAIL |
| 4 | company_admin | `pending_payments_table.row_visible` | — | true | true | ✅ |
| 5 | assistant_admin | `/student.row_visible(Ali11)` | true | — | true | ✅ |
| 5 | instructor | `/attendance.row_visible(Ali11)` | false | — | false | ✅ |
| 6 | assistant_admin | `/student.row_visible(Ali11)` | true | — | true | ✅ |
| 6 | assistant_admin | `voucher.available_count` | — | 0 | 0 | ✅ |
| 6 | assistant_admin | `voucher.redeemed_count` | — | 0 | 1 | ❌ DB_FAIL |
| 6 | instructor | `/attendance.row_visible(Ali11)` | false | — | false | ✅ |
| 6 | instructor | `voucher.available_count` | — | 0 | 0 | ✅ |
| 6 | instructor | `voucher.redeemed_count` | — | 0 | 1 | ❌ DB_FAIL |

## Per-step breakdown

### Step 1: `add_student` as **aa**

```yaml
name: "Ali11"
parent_name: "S11 Parent"
parent_email: "p11@sim.local"
parent_phone: "0123450110"
course: "__sim_93mp3g_Course11"
package: "1-session"
date_of_birth: "2015-01-01"
gender: "male"
school_name: "Sim School"
branch: "Sim S11 Branch 93mp"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-17T13-11-38/screenshots/1-actor-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-17T13-11-38/screenshots/1-observer-inst.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-17T13-11-38/screenshots/1-observer-ca.png`

### Step 2: `mark_offline_paid` as **ca**

```yaml
student: "Ali11"
branch: "Sim S11 Branch 93mp"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-17T13-11-38/screenshots/2-actor-ca.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-17T13-11-38/screenshots/2-observer-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-17T13-11-38/screenshots/2-observer-inst.png`

### Step 3: `approve_pending_payment` as **ca**

```yaml
student: "Ali11"
branch: "Sim S11 Branch 93mp"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-17T13-11-38/screenshots/3-actor-ca.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-17T13-11-38/screenshots/3-observer-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-17T13-11-38/screenshots/3-observer-inst.png`

### Step 4: `mark_present` as **inst**

```yaml
student: "Ali11"
lesson: "Lesson 1"
mission: "Level 1"
activity: "earn-voucher session"
branch: "Sim S11 Branch 93mp"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-17T13-11-38/screenshots/4-actor-inst.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-17T13-11-38/screenshots/4-observer-aa.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-17T13-11-38/screenshots/4-observer-ca.png`

### Step 5: `mark_offline_paid` as **ca**

```yaml
student: "Ali11"
branch: "Sim S11 Branch 93mp"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-17T13-11-38/screenshots/5-actor-ca.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-17T13-11-38/screenshots/5-observer-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-17T13-11-38/screenshots/5-observer-inst.png`

### Step 6: `approve_pending_payment` as **ca**

```yaml
student: "Ali11"
branch: "Sim S11 Branch 93mp"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-17T13-11-38/screenshots/6-actor-ca.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-17T13-11-38/screenshots/6-observer-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-17T13-11-38/screenshots/6-observer-inst.png`

## Fixtures

```json
{
  "runId": "93mp3g",
  "branchId": "a2ce6457-92cf-42df-99f5-c7225c3c01a9",
  "branchName": "__sim_93mp3g_Sim S11 Branch",
  "courseId": "f1d881a9-e874-435b-8483-fe91cac255c6",
  "courseName": "__sim_93mp3g_Course11",
  "packageId": "b602ded6-d914-49de-8ff6-9f056d8ad3da",
  "users": [
    {
      "handle": "aa",
      "role": "assistant_admin",
      "id": "28c94383-04f4-44b3-aaa0-43e3751b7b06",
      "email": "__sim_93mp3g_aa@sim.local",
      "profile": "lms-sim-93mp3g-aa",
      "password": "simpass"
    },
    {
      "handle": "inst",
      "role": "instructor",
      "id": "5dab42bb-5ba4-4eb3-8dd6-28bfdcfe88d9",
      "email": "__sim_93mp3g_inst@sim.local",
      "profile": "lms-sim-93mp3g-inst",
      "password": "simpass"
    },
    {
      "handle": "ca",
      "role": "company_admin",
      "id": "d3c66723-7b78-4a3d-8755-9fc24091aa77",
      "email": "__sim_93mp3g_ca@sim.local",
      "profile": "lms-sim-93mp3g-ca",
      "password": "simpass"
    }
  ],
  "createdVoucherCodes": [],
  "branchCity": "Sim S11 Branch 93mp"
}
```