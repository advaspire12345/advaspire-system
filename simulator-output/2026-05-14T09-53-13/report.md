# Simulator report — scenario-5a-three-sibling-cancel-zero

**Run dir:** /Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T09-53-13
**Steps:** 4
**Drift findings:** 0

✅ All checkpoints passed.

## Full checkpoint table

| Step | Role | Field | DOM | DB | Expected | Result |
|------|------|-------|-----|-----|----------|--------|

## Per-step breakdown

### Step 1: `add_student` as **aa**

```yaml
name: "Ali5a"
parent_name: "S5a Parent"
parent_email: "p5a@sim.local"
parent_phone: "0123450050"
course: "__sim_ym8yv2_S5aCourse"
package: "4-session"
date_of_birth: "2015-01-01"
gender: "male"
school_name: "Sim School"
branch: "Sim S5a Branch ym8y"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T09-53-13/screenshots/1-actor-aa.png`

### Step 2: `add_student` as **aa**

```yaml
name: "Abu5a"
parent_email: "p5a@sim.local"
parent_existing: true
course: "__sim_ym8yv2_S5aCourse"
share_with_sibling: true
date_of_birth: "2017-01-01"
gender: "male"
school_name: "Sim School"
branch: "Sim S5a Branch ym8y"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T09-53-13/screenshots/2-actor-aa.png`

### Step 3: `add_student` as **aa**

```yaml
name: "Aminah5a"
parent_email: "p5a@sim.local"
parent_existing: true
course: "__sim_ym8yv2_S5aCourse"
share_with_sibling: true
date_of_birth: "2019-01-01"
gender: "female"
school_name: "Sim School"
branch: "Sim S5a Branch ym8y"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T09-53-13/screenshots/3-actor-aa.png`

### Step 4: `cancel_enrollment` as **aa**

```yaml
student: "Aminah5a"
branch: "Sim S5a Branch ym8y"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T09-53-13/screenshots/4-actor-aa.png`

## Fixtures

```json
{
  "runId": "ym8yv2",
  "branchId": "3447fb14-0a5c-4a7d-b8af-a5713db17971",
  "branchName": "__sim_ym8yv2_Sim S5a Branch",
  "courseId": "eddffa98-38ec-4b22-9eb2-994868fe38b7",
  "courseName": "__sim_ym8yv2_S5aCourse",
  "packageId": "118775cc-9802-4d19-bba1-68ee321560c3",
  "users": [
    {
      "handle": "aa",
      "role": "assistant_admin",
      "id": "e73b0f85-c912-4f25-ac80-fb90723e934a",
      "email": "__sim_ym8yv2_aa@sim.local",
      "profile": "lms-sim-ym8yv2-aa",
      "password": "simpass"
    }
  ],
  "createdVoucherCodes": [],
  "branchCity": "Sim S5a Branch ym8y"
}
```