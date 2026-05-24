# Simulator report — trial-mark-present-completes

**Run dir:** /Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-11T03-09-19
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
course: "__sim_acrluq_TrialPython"
scheduled_date: "2026-05-11"
scheduled_time: "17:00"
source: "website"
branch: "Sim Trial Branch acrl"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-11T03-09-19/screenshots/1-actor-ca.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-11T03-09-19/screenshots/1-observer-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-11T03-09-19/screenshots/1-observer-inst.png`

### Step 2: `mark_present` as **inst**

```yaml
student: "TrialKid1 (Trial)"
lesson: "Competition"
mission: "Preparation"
activity: "trial intro"
branch: "Sim Trial Branch acrl"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-11T03-09-19/screenshots/2-actor-inst.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-11T03-09-19/screenshots/2-observer-ca.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-11T03-09-19/screenshots/2-observer-aa.png`

## Fixtures

```json
{
  "runId": "acrluq",
  "branchId": "9a3aa9cc-385f-4af5-ac0b-ba32d403039b",
  "branchName": "__sim_acrluq_Sim Trial Branch",
  "courseId": "298e147c-105a-459c-afa2-0784fd58be8d",
  "courseName": "__sim_acrluq_TrialPython",
  "packageId": "cc4c480d-1404-4798-90aa-81fb527bd696",
  "users": [
    {
      "handle": "ca",
      "role": "company_admin",
      "id": "03ff75be-96b3-4428-b4ff-7cea3194fbc7",
      "email": "__sim_acrluq_ca@sim.local",
      "profile": "lms-sim-acrluq-ca",
      "password": "simpass"
    },
    {
      "handle": "aa",
      "role": "assistant_admin",
      "id": "aa362a47-e81b-4c48-8d88-36f9d1d9d251",
      "email": "__sim_acrluq_aa@sim.local",
      "profile": "lms-sim-acrluq-aa",
      "password": "simpass"
    },
    {
      "handle": "inst",
      "role": "instructor",
      "id": "9e42f6eb-a2df-4fc8-93d8-e596fdc35b7f",
      "email": "__sim_acrluq_inst@sim.local",
      "profile": "lms-sim-acrluq-inst",
      "password": "simpass"
    }
  ],
  "createdVoucherCodes": [],
  "branchCity": "Sim Trial Branch acrl"
}
```