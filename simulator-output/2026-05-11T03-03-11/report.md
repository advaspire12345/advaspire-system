# Simulator report — trial-mark-present-completes

**Run dir:** /Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-11T03-03-11
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
course: "__sim_5rdxr0_TrialPython"
scheduled_date: "2026-05-11"
scheduled_time: "17:00"
source: "website"
branch: "Sim Trial Branch 5rdx"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-11T03-03-11/screenshots/1-actor-ca.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-11T03-03-11/screenshots/1-observer-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-11T03-03-11/screenshots/1-observer-inst.png`

### Step 2: `mark_present` as **inst**

```yaml
student: "TrialKid1 (Trial)"
lesson: "Competition"
mission: "Preparation"
activity: "trial intro"
branch: "Sim Trial Branch 5rdx"
```

**Error:** `clickDialogButton: no enabled button "Save" inside dialog`

## Fixtures

```json
{
  "runId": "5rdxr0",
  "branchId": "6dfbee16-10f8-45e2-a9a0-ffc34bb168cc",
  "branchName": "__sim_5rdxr0_Sim Trial Branch",
  "courseId": "d5d37228-2504-4c83-9ae8-142633723197",
  "courseName": "__sim_5rdxr0_TrialPython",
  "packageId": "082d05e6-1fcf-47df-9810-861e17510bc8",
  "users": [
    {
      "handle": "ca",
      "role": "company_admin",
      "id": "85d0394f-3ccf-4503-a0a2-f5c95be41ee1",
      "email": "__sim_5rdxr0_ca@sim.local",
      "profile": "lms-sim-5rdxr0-ca",
      "password": "simpass"
    },
    {
      "handle": "aa",
      "role": "assistant_admin",
      "id": "4f9f9401-6e05-4498-99a7-e65f950b955f",
      "email": "__sim_5rdxr0_aa@sim.local",
      "profile": "lms-sim-5rdxr0-aa",
      "password": "simpass"
    },
    {
      "handle": "inst",
      "role": "instructor",
      "id": "3135e23a-7af9-4b61-ad2e-11271e458b45",
      "email": "__sim_5rdxr0_inst@sim.local",
      "profile": "lms-sim-5rdxr0-inst",
      "password": "simpass"
    }
  ],
  "createdVoucherCodes": [],
  "branchCity": "Sim Trial Branch 5rdx"
}
```