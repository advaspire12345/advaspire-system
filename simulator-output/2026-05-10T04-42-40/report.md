# Simulator report — trial-mark-present-completes

**Run dir:** /Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-10T04-42-40
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
course: "__sim_icz6wz_TrialPython"
scheduled_date: "2026-05-10"
scheduled_time: "17:00"
source: "website"
branch: "Sim Trial Branch"
```

**Error:** `agent-browser failed: npx --yes agent-browser --session sim-icz6wz-ca fill "#scheduled-date" "2026-05-10"
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
  "runId": "icz6wz",
  "branchId": "76c52778-c440-49f0-8a21-4f812bda2799",
  "branchName": "__sim_icz6wz_Sim Trial Branch",
  "courseId": "b1125f15-cc46-40de-b8a9-191e85154b46",
  "courseName": "__sim_icz6wz_TrialPython",
  "packageId": "70e819ff-264f-440f-a56f-a16af06169c6",
  "users": [
    {
      "handle": "ca",
      "role": "company_admin",
      "id": "319e41da-be03-4ed2-bfc7-f35113809671",
      "email": "__sim_icz6wz_ca@sim.local",
      "profile": "lms-sim-icz6wz-ca",
      "password": "simpass"
    },
    {
      "handle": "aa",
      "role": "assistant_admin",
      "id": "1ad10bfb-ed17-474c-88c4-2001ff8bee43",
      "email": "__sim_icz6wz_aa@sim.local",
      "profile": "lms-sim-icz6wz-aa",
      "password": "simpass"
    },
    {
      "handle": "inst",
      "role": "instructor",
      "id": "40f735d7-ce8c-4d67-b5ec-b53a12e5d573",
      "email": "__sim_icz6wz_inst@sim.local",
      "profile": "lms-sim-icz6wz-inst",
      "password": "simpass"
    }
  ],
  "createdVoucherCodes": [],
  "branchCity": "Sim Trial Branch"
}
```