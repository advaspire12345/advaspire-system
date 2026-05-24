# Simulator report — trial-mark-present-completes

**Run dir:** /Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-10T04-00-55
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
course: "__sim_5q4idb_TrialPython"
scheduled_date: "2026-05-10"
scheduled_time: "17:00"
source: "website"
branch: "__sim_5q4idb_Sim Trial Branch"
```

**Error:** `selectByLabel: no option "__sim_5q4idb_Sim Trial Branch" after opening "Branch"`

### Step 2: `mark_present` as **inst**

```yaml
student: "TrialKid1 (Trial)"
lesson: "Lesson 1"
mission: "Level 1"
activity: "trial intro"
branch: "__sim_5q4idb_Sim Trial Branch"
```

**Error:** `clickButton: no button "Mark TrialKid1 (Trial) as present" in snapshot`

## Fixtures

```json
{
  "runId": "5q4idb",
  "branchId": "243794ee-8ff6-4f32-a078-4d315cd3c74c",
  "branchName": "__sim_5q4idb_Sim Trial Branch",
  "courseId": "f457a10b-5590-4b42-ad96-53bedd3ff758",
  "courseName": "__sim_5q4idb_TrialPython",
  "packageId": "f650e76e-29df-45c0-a57c-0f28066b98b2",
  "users": [
    {
      "handle": "ca",
      "role": "company_admin",
      "id": "a4d3864e-cb88-4ba5-bdfd-46f029d99925",
      "email": "__sim_5q4idb_ca@sim.local",
      "profile": "lms-sim-5q4idb-ca",
      "password": "simpass"
    },
    {
      "handle": "aa",
      "role": "assistant_admin",
      "id": "459f78b4-010e-4105-88af-858caaf2c8b1",
      "email": "__sim_5q4idb_aa@sim.local",
      "profile": "lms-sim-5q4idb-aa",
      "password": "simpass"
    },
    {
      "handle": "inst",
      "role": "instructor",
      "id": "5ac85256-03b9-4039-a093-78e64e100f76",
      "email": "__sim_5q4idb_inst@sim.local",
      "profile": "lms-sim-5q4idb-inst",
      "password": "simpass"
    }
  ],
  "createdVoucherCodes": []
}
```