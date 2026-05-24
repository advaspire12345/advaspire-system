# Simulator report — trial-mark-present-completes

**Run dir:** /Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-10T05-01-02
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
course: "__sim_cxmsud_TrialPython"
scheduled_date: "2026-05-10"
scheduled_time: "17:00"
source: "website"
branch: "Sim Trial Branch"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-10T05-01-02/screenshots/1-actor-ca.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-10T05-01-02/screenshots/1-observer-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-10T05-01-02/screenshots/1-observer-inst.png`

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
  "runId": "cxmsud",
  "branchId": "e084d734-3428-4498-af31-bfda896aa27e",
  "branchName": "__sim_cxmsud_Sim Trial Branch",
  "courseId": "a8f1740e-da18-431e-8993-c3dafdc7f33f",
  "courseName": "__sim_cxmsud_TrialPython",
  "packageId": "1c45123c-7883-406c-a1fd-3c0c22cb8df3",
  "users": [
    {
      "handle": "ca",
      "role": "company_admin",
      "id": "a617acae-3340-4adf-af17-68fef2a2c9d1",
      "email": "__sim_cxmsud_ca@sim.local",
      "profile": "lms-sim-cxmsud-ca",
      "password": "simpass"
    },
    {
      "handle": "aa",
      "role": "assistant_admin",
      "id": "91b49192-39e4-4ca9-b1f6-4763ce0ea15e",
      "email": "__sim_cxmsud_aa@sim.local",
      "profile": "lms-sim-cxmsud-aa",
      "password": "simpass"
    },
    {
      "handle": "inst",
      "role": "instructor",
      "id": "2760aff5-d9b9-4891-b87f-95d3c60478a0",
      "email": "__sim_cxmsud_inst@sim.local",
      "profile": "lms-sim-cxmsud-inst",
      "password": "simpass"
    }
  ],
  "createdVoucherCodes": [],
  "branchCity": "Sim Trial Branch"
}
```