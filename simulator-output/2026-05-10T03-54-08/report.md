# Simulator report — trial-mark-present-completes

**Run dir:** /Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-10T03-54-08
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
course: "TrialPython"
scheduled_date: "2026-05-10"
scheduled_time: "17:00"
source: "website"
```

**Error:** `fillLabel: no input "Parent Email" in snapshot`

### Step 2: `mark_present` as **inst**

```yaml
student: "TrialKid1 (Trial)"
lesson: "Lesson 1"
mission: "Level 1"
activity: "trial intro"
```

**Error:** `clickButton: no button "Mark TrialKid1 (Trial) as present" in snapshot`

## Fixtures

```json
{
  "runId": "2nvt5i",
  "branchId": "cde5e446-0b1a-400b-8b57-6d50f4ad9a48",
  "courseId": "28d0f5e0-a190-4486-873b-43b23f56cb1f",
  "packageId": "a90c1e00-e627-4d5d-8541-e24795c0717c",
  "users": [
    {
      "handle": "ca",
      "role": "company_admin",
      "id": "f690e9e0-14fe-430e-ab80-5c599f10e224",
      "email": "__sim_2nvt5i_ca@sim.local",
      "profile": "lms-sim-2nvt5i-ca",
      "password": "simpass"
    },
    {
      "handle": "aa",
      "role": "assistant_admin",
      "id": "77e7820f-f1b3-45c8-b8da-5fe9e3529628",
      "email": "__sim_2nvt5i_aa@sim.local",
      "profile": "lms-sim-2nvt5i-aa",
      "password": "simpass"
    },
    {
      "handle": "inst",
      "role": "instructor",
      "id": "805e5e35-dfbd-434b-ad09-a5e1cc92d8e4",
      "email": "__sim_2nvt5i_inst@sim.local",
      "profile": "lms-sim-2nvt5i-inst",
      "password": "simpass"
    }
  ],
  "createdVoucherCodes": []
}
```