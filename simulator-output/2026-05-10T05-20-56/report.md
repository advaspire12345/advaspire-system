# Simulator report — trial-mark-present-completes

**Run dir:** /Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-10T05-20-56
**Steps:** 2
**Drift findings:** 0

✅ All checkpoints passed.

## Full checkpoint table

| Step | Role | Field | DOM | DB | Expected | Result |
|------|------|-------|-----|-----|----------|--------|

## Per-step breakdown

### Step 1: `add_trial` as **ca**

```yaml
parent_name: "Trial Parent 1"
parent_email: "tp1@sim.local"
parent_phone: "0123456781"
child_name: "TrialKid1"
child_age: 8
course: "__sim_81ur4x_TrialPython"
scheduled_date: "2026-05-10"
scheduled_time: "17:00"
source: "website"
branch: "Sim Trial Branch"
```

**Error:** `add_trial: submit clicked but no trial with child_name="TrialKid1" appeared in the DB. Form validation likely rejected silently (most common: branch/course state didn't propagate; or duplicate phone).`

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
  "runId": "81ur4x",
  "branchId": "70619c64-f4ae-4c56-acd8-7c484c4ca8d3",
  "branchName": "__sim_81ur4x_Sim Trial Branch",
  "courseId": "fbe3d711-4d6d-4f3b-9ff0-b6df9554da90",
  "courseName": "__sim_81ur4x_TrialPython",
  "packageId": "14ef591d-7a4f-4810-9e84-a2f6528abe1c",
  "users": [
    {
      "handle": "ca",
      "role": "company_admin",
      "id": "34c91e7e-e0ef-4eb9-ad5c-e1600de7d8bf",
      "email": "__sim_81ur4x_ca@sim.local",
      "profile": "lms-sim-81ur4x-ca",
      "password": "simpass"
    },
    {
      "handle": "aa",
      "role": "assistant_admin",
      "id": "475881f8-e27a-4f5c-8a4c-1d1970918647",
      "email": "__sim_81ur4x_aa@sim.local",
      "profile": "lms-sim-81ur4x-aa",
      "password": "simpass"
    },
    {
      "handle": "inst",
      "role": "instructor",
      "id": "f4ba2b8f-7fac-41e6-81ed-e46f21312f2e",
      "email": "__sim_81ur4x_inst@sim.local",
      "profile": "lms-sim-81ur4x-inst",
      "password": "simpass"
    }
  ],
  "createdVoucherCodes": [],
  "branchCity": "Sim Trial Branch"
}
```