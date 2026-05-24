# Simulator report — trial-mark-present-completes

**Run dir:** /Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-10T07-20-29
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
course: "__sim_utj5gu_TrialPython"
scheduled_date: "2026-05-10"
scheduled_time: "17:00"
source: "website"
branch: "Sim Trial Branch utj5"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-10T07-20-29/screenshots/1-actor-ca.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-10T07-20-29/screenshots/1-observer-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-10T07-20-29/screenshots/1-observer-inst.png`

### Step 2: `mark_present` as **inst**

```yaml
student: "TrialKid1 (Trial)"
lesson: "Lesson 1"
mission: "Level 1"
activity: "trial intro"
branch: "Sim Trial Branch utj5"
```

**Error:** `selectByLabel: no option "Lesson 1" after opening "Lesson"`

## Fixtures

```json
{
  "runId": "utj5gu",
  "branchId": "018eacf7-25be-42f6-95de-6115e0a670ba",
  "branchName": "__sim_utj5gu_Sim Trial Branch",
  "courseId": "3a92e968-aca1-4e27-8ed9-47dc5b535879",
  "courseName": "__sim_utj5gu_TrialPython",
  "packageId": "f78ffc51-02e7-4137-b823-652e8ffe8d8f",
  "users": [
    {
      "handle": "ca",
      "role": "company_admin",
      "id": "01b07898-0018-463a-84b0-06596e54bb39",
      "email": "__sim_utj5gu_ca@sim.local",
      "profile": "lms-sim-utj5gu-ca",
      "password": "simpass"
    },
    {
      "handle": "aa",
      "role": "assistant_admin",
      "id": "cf92ef9c-c43d-4754-86fa-7cfb57696815",
      "email": "__sim_utj5gu_aa@sim.local",
      "profile": "lms-sim-utj5gu-aa",
      "password": "simpass"
    },
    {
      "handle": "inst",
      "role": "instructor",
      "id": "73e1bf1e-028d-47e0-b796-b1e2514d0071",
      "email": "__sim_utj5gu_inst@sim.local",
      "profile": "lms-sim-utj5gu-inst",
      "password": "simpass"
    }
  ],
  "createdVoucherCodes": [],
  "branchCity": "Sim Trial Branch utj5"
}
```