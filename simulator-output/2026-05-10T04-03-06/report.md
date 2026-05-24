# Simulator report — trial-mark-present-completes

**Run dir:** /Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-10T04-03-06
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
course: "__sim_u7587q_TrialPython"
scheduled_date: "2026-05-10"
scheduled_time: "17:00"
source: "website"
branch: "Sim Trial Branch"
```

**Error:** `fillLabel: no input "Day" in snapshot`

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
  "runId": "u7587q",
  "branchId": "4f4d7426-9df2-4ecf-8057-55cf08fce77d",
  "branchName": "__sim_u7587q_Sim Trial Branch",
  "courseId": "9f51a7b2-31d3-4faf-ac60-7b843decae99",
  "courseName": "__sim_u7587q_TrialPython",
  "packageId": "50203d67-221e-4ede-8663-e42336a58ccd",
  "users": [
    {
      "handle": "ca",
      "role": "company_admin",
      "id": "30871003-a0e1-4ca4-9599-323cb97c4ecf",
      "email": "__sim_u7587q_ca@sim.local",
      "profile": "lms-sim-u7587q-ca",
      "password": "simpass"
    },
    {
      "handle": "aa",
      "role": "assistant_admin",
      "id": "e719f326-b548-42b2-a199-9550ebd45086",
      "email": "__sim_u7587q_aa@sim.local",
      "profile": "lms-sim-u7587q-aa",
      "password": "simpass"
    },
    {
      "handle": "inst",
      "role": "instructor",
      "id": "53eeba8a-f505-4d1d-ba5e-cf756db3af14",
      "email": "__sim_u7587q_inst@sim.local",
      "profile": "lms-sim-u7587q-inst",
      "password": "simpass"
    }
  ],
  "createdVoucherCodes": [],
  "branchCity": "Sim Trial Branch"
}
```