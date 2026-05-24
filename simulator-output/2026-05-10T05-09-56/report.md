# Simulator report — trial-mark-present-completes

**Run dir:** /Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-10T05-09-56
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
course: "__sim_92r34z_TrialPython"
scheduled_date: "2026-05-10"
scheduled_time: "17:00"
source: "website"
branch: "Sim Trial Branch"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-10T05-09-56/screenshots/1-actor-ca.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-10T05-09-56/screenshots/1-observer-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-10T05-09-56/screenshots/1-observer-inst.png`

### Step 2: `mark_present` as **inst**

```yaml
student: "TrialKid1 (Trial)"
lesson: "Lesson 1"
mission: "Level 1"
activity: "trial intro"
branch: "Sim Trial Branch"
```

**Error:** `clickButton: no button "Mark TrialKid1 (Trial) as present" in snapshot`

## Fixtures

```json
{
  "runId": "92r34z",
  "branchId": "74e07a8b-662f-4e99-b9bf-29db6cbda1cc",
  "branchName": "__sim_92r34z_Sim Trial Branch",
  "courseId": "b24f6358-7772-40aa-a188-28ab67b45136",
  "courseName": "__sim_92r34z_TrialPython",
  "packageId": "2e2d8114-3159-492e-bf9d-9af7fc5e4323",
  "users": [
    {
      "handle": "ca",
      "role": "company_admin",
      "id": "d2693684-a15c-4b34-b9cb-06a0049ffdef",
      "email": "__sim_92r34z_ca@sim.local",
      "profile": "lms-sim-92r34z-ca",
      "password": "simpass"
    },
    {
      "handle": "aa",
      "role": "assistant_admin",
      "id": "0780747e-579e-4a49-9a72-4ea7f2a926fa",
      "email": "__sim_92r34z_aa@sim.local",
      "profile": "lms-sim-92r34z-aa",
      "password": "simpass"
    },
    {
      "handle": "inst",
      "role": "instructor",
      "id": "f021cd04-fe33-4ff9-b261-69c88095891f",
      "email": "__sim_92r34z_inst@sim.local",
      "profile": "lms-sim-92r34z-inst",
      "password": "simpass"
    }
  ],
  "createdVoucherCodes": [],
  "branchCity": "Sim Trial Branch"
}
```