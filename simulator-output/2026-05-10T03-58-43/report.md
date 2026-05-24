# Simulator report — trial-mark-present-completes

**Run dir:** /Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-10T03-58-43
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

**Error:** `Cannot read properties of undefined (reading 'replace')`

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
  "runId": "qyns4g",
  "branchId": "00813044-4236-449b-a9bf-00ccb8a88cee",
  "courseId": "b0bd7d1d-7794-4532-9348-a3da08ec8d93",
  "packageId": "7491c656-3994-4986-a402-8cfe8f9cef91",
  "users": [
    {
      "handle": "ca",
      "role": "company_admin",
      "id": "1ce5a41a-4481-489b-840a-b04523985cbe",
      "email": "__sim_qyns4g_ca@sim.local",
      "profile": "lms-sim-qyns4g-ca",
      "password": "simpass"
    },
    {
      "handle": "aa",
      "role": "assistant_admin",
      "id": "ce568e9e-6b30-4f67-99cd-6093fb9795e4",
      "email": "__sim_qyns4g_aa@sim.local",
      "profile": "lms-sim-qyns4g-aa",
      "password": "simpass"
    },
    {
      "handle": "inst",
      "role": "instructor",
      "id": "ce8ab747-b3e9-4e80-b8a5-46aa57eca99c",
      "email": "__sim_qyns4g_inst@sim.local",
      "profile": "lms-sim-qyns4g-inst",
      "password": "simpass"
    }
  ],
  "createdVoucherCodes": []
}
```