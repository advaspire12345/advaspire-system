# Simulator report — scenario-6a-two-sibling-cancel-zero

**Run dir:** /Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T10-01-54
**Steps:** 3
**Drift findings:** 0

✅ All checkpoints passed.

## Full checkpoint table

| Step | Role | Field | DOM | DB | Expected | Result |
|------|------|-------|-----|-----|----------|--------|

## Per-step breakdown

### Step 1: `add_student` as **aa**

```yaml
name: "Ali6a"
parent_name: "S6a Parent"
parent_email: "p6a@sim.local"
parent_phone: "0123450060"
course: "__sim_2uk80h_S6aCourse"
package: "4-session"
date_of_birth: "2015-01-01"
gender: "male"
school_name: "Sim School"
branch: "Sim S6a Branch 2uk8"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T10-01-54/screenshots/1-actor-aa.png`

### Step 2: `add_student` as **aa**

```yaml
name: "Abu6a"
parent_email: "p6a@sim.local"
parent_existing: true
course: "__sim_2uk80h_S6aCourse"
share_with_sibling: true
date_of_birth: "2017-01-01"
gender: "male"
school_name: "Sim School"
branch: "Sim S6a Branch 2uk8"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T10-01-54/screenshots/2-actor-aa.png`

### Step 3: `cancel_enrollment` as **aa**

```yaml
student: "Abu6a"
branch: "Sim S6a Branch 2uk8"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T10-01-54/screenshots/3-actor-aa.png`

## Fixtures

```json
{
  "runId": "2uk80h",
  "branchId": "94f147da-7cd0-440e-b938-69297ee4d0b2",
  "branchName": "__sim_2uk80h_Sim S6a Branch",
  "courseId": "22fc7739-d761-4d94-9579-0be091620f1c",
  "courseName": "__sim_2uk80h_S6aCourse",
  "packageId": "f7d2a130-5c12-419c-8918-57ec9642b84f",
  "users": [
    {
      "handle": "aa",
      "role": "assistant_admin",
      "id": "4ad64dfa-bab2-4cee-aa16-2ea120c795a5",
      "email": "__sim_2uk80h_aa@sim.local",
      "profile": "lms-sim-2uk80h-aa",
      "password": "simpass"
    }
  ],
  "createdVoucherCodes": [],
  "branchCity": "Sim S6a Branch 2uk8"
}
```