# Simulator report — trial-mark-present-completes

**Run dir:** /Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-10T07-24-49
**Steps:** 2
**Drift findings:** 3

## ❌ Drift / failure findings

| Step | Role | Field | DOM | DB | Expected | Result |
|------|------|-------|-----|-----|----------|--------|
| 1 | assistant_admin | `trial_table.status` | — | null | Pending | ❌ DB_FAIL |
| 1 | instructor | `trial_table.status` | — | null | Pending | ❌ DB_FAIL |
| 1 | instructor | `attendance_table.row_visible(TrialKid1 (Trial))` | — | null | true | ❌ DB_FAIL |

## Full checkpoint table

| Step | Role | Field | DOM | DB | Expected | Result |
|------|------|-------|-----|-----|----------|--------|
| 1 | assistant_admin | `trial_table.status` | — | null | Pending | ❌ DB_FAIL |
| 1 | instructor | `trial_table.status` | — | null | Pending | ❌ DB_FAIL |
| 1 | instructor | `attendance_table.row_visible(TrialKid1 (Trial))` | — | null | true | ❌ DB_FAIL |

## Per-step breakdown

### Step 1: `add_trial` as **ca**

```yaml
parent_name: "Trial Parent 1"
parent_email: "tp1@sim.local"
parent_phone: "0123456781"
child_name: "TrialKid1"
child_age: 8
course: "__sim_5566s1_TrialPython"
scheduled_date: "2026-05-10"
scheduled_time: "17:00"
source: "website"
branch: "Sim Trial Branch 5566"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-10T07-24-49/screenshots/1-actor-ca.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-10T07-24-49/screenshots/1-observer-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-10T07-24-49/screenshots/1-observer-inst.png`

### Step 2: `mark_present` as **inst**

```yaml
student: "TrialKid1 (Trial)"
lesson: "Lesson 1"
mission: "Level 1"
activity: "trial intro"
branch: "Sim Trial Branch 5566"
```

**Error:** `agent-browser failed: npx --yes agent-browser --session sim-5566s1-inst open http://localhost:3000/attendance
✗ Failed to read: Resource temporarily unavailable (os error 35) (after 5 retries - daemon may be busy or unresponsive)
`

## Fixtures

```json
{
  "runId": "5566s1",
  "branchId": "d12ec4fe-0a5c-44ca-a666-543a85c2a2f4",
  "branchName": "__sim_5566s1_Sim Trial Branch",
  "courseId": "64e409f3-a521-48b8-a5f4-3373cd44897d",
  "courseName": "__sim_5566s1_TrialPython",
  "packageId": "e9119696-5a76-4035-a46d-0bcaf8707c92",
  "users": [
    {
      "handle": "ca",
      "role": "company_admin",
      "id": "e93a822a-a824-457f-8c77-095bd2dc5d55",
      "email": "__sim_5566s1_ca@sim.local",
      "profile": "lms-sim-5566s1-ca",
      "password": "simpass"
    },
    {
      "handle": "aa",
      "role": "assistant_admin",
      "id": "42fbe1d2-39b7-450b-9cdf-c109996a7775",
      "email": "__sim_5566s1_aa@sim.local",
      "profile": "lms-sim-5566s1-aa",
      "password": "simpass"
    },
    {
      "handle": "inst",
      "role": "instructor",
      "id": "41190582-4457-4d5b-983b-7be9f85d7a4e",
      "email": "__sim_5566s1_inst@sim.local",
      "profile": "lms-sim-5566s1-inst",
      "password": "simpass"
    }
  ],
  "createdVoucherCodes": [],
  "branchCity": "Sim Trial Branch 5566"
}
```