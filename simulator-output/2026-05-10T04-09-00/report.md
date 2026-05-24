# Simulator report — trial-mark-present-completes

**Run dir:** /Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-10T04-09-00
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
course: "__sim_ot99hv_TrialPython"
scheduled_date: "2026-05-10"
scheduled_time: "17:00"
source: "website"
branch: "Sim Trial Branch"
```

**Error:** `agent-browser failed: npx --yes agent-browser --session sim-ot99hv-ca fill "#scheduled-date" "2026-05-10"
✗ Element not found. Verify the selector is correct and the element exists in the DOM.
`

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
  "runId": "ot99hv",
  "branchId": "480f0a43-45e2-4166-af64-bbdf284bb358",
  "branchName": "__sim_ot99hv_Sim Trial Branch",
  "courseId": "6e3b1f54-2058-4ace-aa00-c88c51b12621",
  "courseName": "__sim_ot99hv_TrialPython",
  "packageId": "a9e3457f-ae6a-4877-8e09-dc097d0aca50",
  "users": [
    {
      "handle": "ca",
      "role": "company_admin",
      "id": "8e61f3b9-4676-4b45-921b-f8943f754535",
      "email": "__sim_ot99hv_ca@sim.local",
      "profile": "lms-sim-ot99hv-ca",
      "password": "simpass"
    },
    {
      "handle": "aa",
      "role": "assistant_admin",
      "id": "58f560aa-54bf-4f40-9b0e-92247402af5e",
      "email": "__sim_ot99hv_aa@sim.local",
      "profile": "lms-sim-ot99hv-aa",
      "password": "simpass"
    },
    {
      "handle": "inst",
      "role": "instructor",
      "id": "43b3d204-2466-4f2b-ad51-89e37a049b48",
      "email": "__sim_ot99hv_inst@sim.local",
      "profile": "lms-sim-ot99hv-inst",
      "password": "simpass"
    }
  ],
  "createdVoucherCodes": [],
  "branchCity": "Sim Trial Branch"
}
```