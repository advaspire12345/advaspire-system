# Simulator report — trial-mark-present-completes

**Run dir:** /Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-10T04-05-43
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
course: "__sim_ukt9l7_TrialPython"
scheduled_date: "2026-05-10"
scheduled_time: "17:00"
source: "website"
branch: "Sim Trial Branch"
```

**Error:** `agent-browser failed: npx --yes agent-browser --session sim-ukt9l7-ca fill "#scheduled-date" "2026-05-10"
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
  "runId": "ukt9l7",
  "branchId": "a85c561b-85b8-43db-b3d9-e6c18c7a01d2",
  "branchName": "__sim_ukt9l7_Sim Trial Branch",
  "courseId": "b987a1b4-780d-4763-a568-22308c6741db",
  "courseName": "__sim_ukt9l7_TrialPython",
  "packageId": "9df76e77-9427-4bb4-948e-08b2a611ab70",
  "users": [
    {
      "handle": "ca",
      "role": "company_admin",
      "id": "35a2eeb6-1226-4b86-be9b-c6bd34ed9dd9",
      "email": "__sim_ukt9l7_ca@sim.local",
      "profile": "lms-sim-ukt9l7-ca",
      "password": "simpass"
    },
    {
      "handle": "aa",
      "role": "assistant_admin",
      "id": "dbad32f0-5a14-433e-9c90-e5ceeb77fea3",
      "email": "__sim_ukt9l7_aa@sim.local",
      "profile": "lms-sim-ukt9l7-aa",
      "password": "simpass"
    },
    {
      "handle": "inst",
      "role": "instructor",
      "id": "dee11818-dc1e-429c-b775-ea0a4612f98c",
      "email": "__sim_ukt9l7_inst@sim.local",
      "profile": "lms-sim-ukt9l7-inst",
      "password": "simpass"
    }
  ],
  "createdVoucherCodes": [],
  "branchCity": "Sim Trial Branch"
}
```