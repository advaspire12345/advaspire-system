# Simulator report — trial-mark-present-completes

**Run dir:** /Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-11T03-06-06
**Steps:** 2
**Drift findings:** 11

## ❌ Drift / failure findings

| Step | Role | Field | DOM | DB | Expected | Result |
|------|------|-------|-----|-----|----------|--------|
| 1 | assistant_admin | `trial_table.status` | — | null | Pending | ❌ DB_FAIL |
| 1 | instructor | `trial_table.status` | — | null | Pending | ❌ DB_FAIL |
| 1 | instructor | `attendance_table.row_visible(TrialKid1 (Trial))` | — | null | true | ❌ DB_FAIL |
| 2 | company_admin | `/student.row_visible(TrialKid1 (Trial))` | false | — | true | ❌ DRIFT (DOM != expected) |
| 2 | company_admin | `trial_table.status` | — | null | Completed | ❌ DB_FAIL |
| 2 | company_admin | `trial_table.row_visible` | — | null | true | ❌ DB_FAIL |
| 2 | company_admin | `attendance_table.row_visible(TrialKid1 (Trial))` | — | null | false | ❌ DB_FAIL |
| 2 | assistant_admin | `/student.row_visible(TrialKid1 (Trial))` | false | — | true | ❌ DRIFT (DOM != expected) |
| 2 | assistant_admin | `trial_table.status` | — | null | Completed | ❌ DB_FAIL |
| 2 | assistant_admin | `trial_table.row_visible` | — | null | true | ❌ DB_FAIL |
| 2 | assistant_admin | `attendance_table.row_visible(TrialKid1 (Trial))` | — | null | false | ❌ DB_FAIL |

## Full checkpoint table

| Step | Role | Field | DOM | DB | Expected | Result |
|------|------|-------|-----|-----|----------|--------|
| 1 | assistant_admin | `trial_table.status` | — | null | Pending | ❌ DB_FAIL |
| 1 | instructor | `trial_table.status` | — | null | Pending | ❌ DB_FAIL |
| 1 | instructor | `attendance_table.row_visible(TrialKid1 (Trial))` | — | null | true | ❌ DB_FAIL |
| 2 | company_admin | `/student.row_visible(TrialKid1 (Trial))` | false | — | true | ❌ DRIFT (DOM != expected) |
| 2 | company_admin | `trial_table.status` | — | null | Completed | ❌ DB_FAIL |
| 2 | company_admin | `trial_table.row_visible` | — | null | true | ❌ DB_FAIL |
| 2 | company_admin | `attendance_table.row_visible(TrialKid1 (Trial))` | — | null | false | ❌ DB_FAIL |
| 2 | assistant_admin | `/student.row_visible(TrialKid1 (Trial))` | false | — | true | ❌ DRIFT (DOM != expected) |
| 2 | assistant_admin | `trial_table.status` | — | null | Completed | ❌ DB_FAIL |
| 2 | assistant_admin | `trial_table.row_visible` | — | null | true | ❌ DB_FAIL |
| 2 | assistant_admin | `attendance_table.row_visible(TrialKid1 (Trial))` | — | null | false | ❌ DB_FAIL |

## Per-step breakdown

### Step 1: `add_trial` as **ca**

```yaml
parent_name: "Trial Parent 1"
parent_email: "tp1@sim.local"
parent_phone: "0123456781"
child_name: "TrialKid1"
child_age: 8
course: "__sim_czpreb_TrialPython"
scheduled_date: "2026-05-11"
scheduled_time: "17:00"
source: "website"
branch: "Sim Trial Branch czpr"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-11T03-06-06/screenshots/1-actor-ca.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-11T03-06-06/screenshots/1-observer-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-11T03-06-06/screenshots/1-observer-inst.png`

### Step 2: `mark_present` as **inst**

```yaml
student: "TrialKid1 (Trial)"
lesson: "Competition"
mission: "Preparation"
activity: "trial intro"
branch: "Sim Trial Branch czpr"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-11T03-06-06/screenshots/2-actor-inst.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-11T03-06-06/screenshots/2-observer-ca.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-11T03-06-06/screenshots/2-observer-aa.png`

## Fixtures

```json
{
  "runId": "czpreb",
  "branchId": "eb7fa68d-25cf-447a-94f5-d5ea2237604a",
  "branchName": "__sim_czpreb_Sim Trial Branch",
  "courseId": "2c2d741b-f10e-42fa-93dc-9e04c2e74997",
  "courseName": "__sim_czpreb_TrialPython",
  "packageId": "eabb7b6a-876f-474e-82aa-27b2ada50de7",
  "users": [
    {
      "handle": "ca",
      "role": "company_admin",
      "id": "57bcb9dc-e99d-4597-a233-eca75e7bba0c",
      "email": "__sim_czpreb_ca@sim.local",
      "profile": "lms-sim-czpreb-ca",
      "password": "simpass"
    },
    {
      "handle": "aa",
      "role": "assistant_admin",
      "id": "66610038-0acb-40b8-ac1a-5391a2b6c0da",
      "email": "__sim_czpreb_aa@sim.local",
      "profile": "lms-sim-czpreb-aa",
      "password": "simpass"
    },
    {
      "handle": "inst",
      "role": "instructor",
      "id": "16cef697-7f80-44c8-8dc7-a369b2a7f3f5",
      "email": "__sim_czpreb_inst@sim.local",
      "profile": "lms-sim-czpreb-inst",
      "password": "simpass"
    }
  ],
  "createdVoucherCodes": [],
  "branchCity": "Sim Trial Branch czpr"
}
```