# Simulator report — trial-mark-present-completes

**Run dir:** /Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-10T07-10-36
**Steps:** 2
**Drift findings:** 3

## ❌ Drift / failure findings

| Step | Role | Field | DOM | DB | Expected | Result |
|------|------|-------|-----|-----|----------|--------|
| 1 | assistant_admin | `trial_table.status` | — | null | Pending | ❌ DB_FAIL |
| 1 | instructor | `trial_table.status` | — | null | Pending | ❌ DB_FAIL |
| 1 | instructor | `attendance_table.row_visible(TrialKid1 (Trial))` | — | null | true | ❌ DB_FAIL |

## Full checkpoint table

| Step | Role | Field | DOM | DB | Expected | Result |
|------|------|-------|-----|-----|----------|--------|
| 1 | assistant_admin | `trial_table.status` | — | null | Pending | ❌ DB_FAIL |
| 1 | instructor | `trial_table.status` | — | null | Pending | ❌ DB_FAIL |
| 1 | instructor | `attendance_table.row_visible(TrialKid1 (Trial))` | — | null | true | ❌ DB_FAIL |

## Per-step breakdown

### Step 1: `add_trial` as **ca**

```yaml
parent_name: "Trial Parent 1"
parent_email: "tp1@sim.local"
parent_phone: "0123456781"
child_name: "TrialKid1"
child_age: 8
course: "__sim_j1rcfo_TrialPython"
scheduled_date: "2026-05-10"
scheduled_time: "17:00"
source: "website"
branch: "Sim Trial Branch"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-10T07-10-36/screenshots/1-actor-ca.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-10T07-10-36/screenshots/1-observer-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-10T07-10-36/screenshots/1-observer-inst.png`

### Step 2: `mark_present` as **inst**

```yaml
student: "TrialKid1 (Trial)"
lesson: "Lesson 1"
mission: "Level 1"
activity: "trial intro"
branch: "Sim Trial Branch"
```

**Error:** `fillLabel: no input "Lesson" in snapshot`

## Fixtures

```json
{
  "runId": "j1rcfo",
  "branchId": "6d397721-85c8-4c75-922c-42c0b68509df",
  "branchName": "__sim_j1rcfo_Sim Trial Branch",
  "courseId": "04992ed7-38cb-4b1a-894e-cad3a3087605",
  "courseName": "__sim_j1rcfo_TrialPython",
  "packageId": "40e962f8-12b9-454a-be5b-caddacc8688c",
  "users": [
    {
      "handle": "ca",
      "role": "company_admin",
      "id": "f0befb61-27a2-4c33-ab69-8c87c4968541",
      "email": "__sim_j1rcfo_ca@sim.local",
      "profile": "lms-sim-j1rcfo-ca",
      "password": "simpass"
    },
    {
      "handle": "aa",
      "role": "assistant_admin",
      "id": "0c21e44e-12eb-4c0c-9918-ecacbf122d46",
      "email": "__sim_j1rcfo_aa@sim.local",
      "profile": "lms-sim-j1rcfo-aa",
      "password": "simpass"
    },
    {
      "handle": "inst",
      "role": "instructor",
      "id": "6e5d4b8b-db97-48de-b833-52311c7cfbda",
      "email": "__sim_j1rcfo_inst@sim.local",
      "profile": "lms-sim-j1rcfo-inst",
      "password": "simpass"
    }
  ],
  "createdVoucherCodes": [],
  "branchCity": "Sim Trial Branch"
}
```