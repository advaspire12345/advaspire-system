# Simulator report — trial-mark-present-completes

**Run dir:** /Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-10T06-58-15
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
course: "__sim_4zb5ue_TrialPython"
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
  "runId": "4zb5ue",
  "branchId": "576e5793-c549-477b-b12f-fb03b83d107f",
  "branchName": "__sim_4zb5ue_Sim Trial Branch",
  "courseId": "b6642495-ec91-4866-9aa3-19db9b57eb87",
  "courseName": "__sim_4zb5ue_TrialPython",
  "packageId": "a50a0838-712f-40a0-b9ac-535929793af0",
  "users": [
    {
      "handle": "ca",
      "role": "company_admin",
      "id": "1223b9e3-5c99-47e4-b718-56b2f9158d73",
      "email": "__sim_4zb5ue_ca@sim.local",
      "profile": "lms-sim-4zb5ue-ca",
      "password": "simpass"
    },
    {
      "handle": "aa",
      "role": "assistant_admin",
      "id": "b2ac1ca8-1f9f-4f90-90fa-91246b50f2b8",
      "email": "__sim_4zb5ue_aa@sim.local",
      "profile": "lms-sim-4zb5ue-aa",
      "password": "simpass"
    },
    {
      "handle": "inst",
      "role": "instructor",
      "id": "b3edb1c1-2e05-4708-af83-e0f2d0138854",
      "email": "__sim_4zb5ue_inst@sim.local",
      "profile": "lms-sim-4zb5ue-inst",
      "password": "simpass"
    }
  ],
  "createdVoucherCodes": [],
  "branchCity": "Sim Trial Branch"
}
```