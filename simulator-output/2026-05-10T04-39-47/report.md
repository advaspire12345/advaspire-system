# Simulator report — trial-mark-present-completes

**Run dir:** /Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-10T04-39-47
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
course: "__sim_f9sxey_TrialPython"
scheduled_date: "2026-05-10"
scheduled_time: "17:00"
source: "website"
branch: "Sim Trial Branch"
```

**Error:** `agent-browser failed: npx --yes agent-browser --session sim-f9sxey-ca fill "#scheduled-date" "2026-05-10"
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
  "runId": "f9sxey",
  "branchId": "e17f12ae-7865-43ab-9939-49d5f71e52f4",
  "branchName": "__sim_f9sxey_Sim Trial Branch",
  "courseId": "acf4a18a-4c31-46e3-b0a0-3ec3268508b2",
  "courseName": "__sim_f9sxey_TrialPython",
  "packageId": "baa95208-6304-48bd-8e9f-45428597bbc0",
  "users": [
    {
      "handle": "ca",
      "role": "company_admin",
      "id": "88192b10-b86d-44a7-a8b0-7549ecb220dd",
      "email": "__sim_f9sxey_ca@sim.local",
      "profile": "lms-sim-f9sxey-ca",
      "password": "simpass"
    },
    {
      "handle": "aa",
      "role": "assistant_admin",
      "id": "95595f8d-25b1-4cc9-bce8-395bf637c04c",
      "email": "__sim_f9sxey_aa@sim.local",
      "profile": "lms-sim-f9sxey-aa",
      "password": "simpass"
    },
    {
      "handle": "inst",
      "role": "instructor",
      "id": "27ce0b65-e900-4be5-bcaf-bdc2b107a94b",
      "email": "__sim_f9sxey_inst@sim.local",
      "profile": "lms-sim-f9sxey-inst",
      "password": "simpass"
    }
  ],
  "createdVoucherCodes": [],
  "branchCity": "Sim Trial Branch"
}
```