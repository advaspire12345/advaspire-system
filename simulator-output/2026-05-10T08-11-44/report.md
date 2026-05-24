# Simulator report — trial-mark-present-completes

**Run dir:** /Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-10T08-11-44
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
course: "__sim_rd6a5d_TrialPython"
scheduled_date: "2026-05-10"
scheduled_time: "17:00"
source: "website"
branch: "Sim Trial Branch rd6a"
```

**Error:** `fillLabel: no input "Child Name" in snapshot`

### Step 2: `mark_present` as **inst**

```yaml
student: "TrialKid1 (Trial)"
lesson: "Competition"
mission: "Preparation"
activity: "trial intro"
branch: "Sim Trial Branch rd6a"
```

**Error:** `clickButton: no button matching "Mark TrialKid1 (Trial) as present" in snapshot`

## Fixtures

```json
{
  "runId": "rd6a5d",
  "branchId": "43b9ca44-30c8-4c1d-a013-7409c34e0605",
  "branchName": "__sim_rd6a5d_Sim Trial Branch",
  "courseId": "4abfa928-34bd-48af-acc6-ef62923f0503",
  "courseName": "__sim_rd6a5d_TrialPython",
  "packageId": "f3623df2-dfe1-47ef-b8e8-f978fdc4e842",
  "users": [
    {
      "handle": "ca",
      "role": "company_admin",
      "id": "51477536-6a40-4be1-b622-7a1d48b18ee6",
      "email": "__sim_rd6a5d_ca@sim.local",
      "profile": "lms-sim-rd6a5d-ca",
      "password": "simpass"
    },
    {
      "handle": "aa",
      "role": "assistant_admin",
      "id": "232a1c30-9d1d-484d-9eb1-8bc9526c309e",
      "email": "__sim_rd6a5d_aa@sim.local",
      "profile": "lms-sim-rd6a5d-aa",
      "password": "simpass"
    },
    {
      "handle": "inst",
      "role": "instructor",
      "id": "509789ee-c671-4e1d-9606-ff565ac2ed26",
      "email": "__sim_rd6a5d_inst@sim.local",
      "profile": "lms-sim-rd6a5d-inst",
      "password": "simpass"
    }
  ],
  "createdVoucherCodes": [],
  "branchCity": "Sim Trial Branch rd6a"
}
```