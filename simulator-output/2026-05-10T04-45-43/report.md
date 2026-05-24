# Simulator report — trial-mark-present-completes

**Run dir:** /Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-10T04-45-43
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
course: "__sim_mywdci_TrialPython"
scheduled_date: "2026-05-10"
scheduled_time: "17:00"
source: "website"
branch: "Sim Trial Branch"
```

**Error:** `fillLabel: no input "Child Name" in snapshot`

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
  "runId": "mywdci",
  "branchId": "d985e105-74e6-4a17-9a84-b64350a51d3f",
  "branchName": "__sim_mywdci_Sim Trial Branch",
  "courseId": "e6054334-ca11-442b-a629-3b26e91c9577",
  "courseName": "__sim_mywdci_TrialPython",
  "packageId": "64feadf3-cd79-4bde-bbd3-bca2de5e3c7b",
  "users": [
    {
      "handle": "ca",
      "role": "company_admin",
      "id": "a883f2c2-1960-433f-af81-b612887a9080",
      "email": "__sim_mywdci_ca@sim.local",
      "profile": "lms-sim-mywdci-ca",
      "password": "simpass"
    },
    {
      "handle": "aa",
      "role": "assistant_admin",
      "id": "2b479ee3-e87d-423e-a643-c58c1eabf42f",
      "email": "__sim_mywdci_aa@sim.local",
      "profile": "lms-sim-mywdci-aa",
      "password": "simpass"
    },
    {
      "handle": "inst",
      "role": "instructor",
      "id": "e4f5343c-a7fd-429a-862c-78fbaaee41a0",
      "email": "__sim_mywdci_inst@sim.local",
      "profile": "lms-sim-mywdci-inst",
      "password": "simpass"
    }
  ],
  "createdVoucherCodes": [],
  "branchCity": "Sim Trial Branch"
}
```