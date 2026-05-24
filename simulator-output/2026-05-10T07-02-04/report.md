# Simulator report — trial-mark-present-completes

**Run dir:** /Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-10T07-02-04
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
course: "__sim_l1gofa_TrialPython"
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
  "runId": "l1gofa",
  "branchId": "4350ad68-5398-497b-8861-14b2a979d720",
  "branchName": "__sim_l1gofa_Sim Trial Branch",
  "courseId": "dd1c24d5-befc-4425-96ea-31e234c29079",
  "courseName": "__sim_l1gofa_TrialPython",
  "packageId": "f38d50ba-cc62-4799-acaf-e1bcd2b0930e",
  "users": [
    {
      "handle": "ca",
      "role": "company_admin",
      "id": "6e52266c-9f0d-4a72-b8f6-d8c8435593e9",
      "email": "__sim_l1gofa_ca@sim.local",
      "profile": "lms-sim-l1gofa-ca",
      "password": "simpass"
    },
    {
      "handle": "aa",
      "role": "assistant_admin",
      "id": "95d6c278-91e9-4aff-90df-a151c510e423",
      "email": "__sim_l1gofa_aa@sim.local",
      "profile": "lms-sim-l1gofa-aa",
      "password": "simpass"
    },
    {
      "handle": "inst",
      "role": "instructor",
      "id": "47e82a05-a6d2-4df9-aa72-48b0335f8d9f",
      "email": "__sim_l1gofa_inst@sim.local",
      "profile": "lms-sim-l1gofa-inst",
      "password": "simpass"
    }
  ],
  "createdVoucherCodes": [],
  "branchCity": "Sim Trial Branch"
}
```