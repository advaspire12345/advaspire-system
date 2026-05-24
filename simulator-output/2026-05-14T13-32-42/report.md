# Simulator report — scenario-8c-individual-to-shared-negative

**Run dir:** /Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T13-32-42
**Steps:** 6
**Drift findings:** 0

✅ All checkpoints passed.

## Full checkpoint table

| Step | Role | Field | DOM | DB | Expected | Result |
|------|------|-------|-----|-----|----------|--------|

## Per-step breakdown

### Step 1: `add_student` as **aa**

```yaml
name: "Abu8c"
parent_name: "8c Parent"
parent_email: "p8c@sim.local"
parent_phone: "0123450080"
course: "__sim_mclqq0_Course8c"
package: "4-session"
date_of_birth: "2016-02-10"
gender: "male"
school_name: "Sim School"
branch: "Sim 8c Branch mclq"
```

**Error:** `agent-browser failed: npx --yes agent-browser --session sim-mclqq0-aa open http://localhost:3000/student
✗ Navigation failed: net::ERR_CONNECTION_REFUSED
`

### Step 2: `add_student` as **aa**

```yaml
name: "Ali8c"
parent_email: "p8c@sim.local"
parent_existing: true
course: "__sim_mclqq0_Course8c"
package: "4-session"
force_individual: true
date_of_birth: "2014-03-05"
gender: "male"
school_name: "Sim School"
branch: "Sim 8c Branch mclq"
```

**Error:** `selectByLabel: no option "p8c@sim.local" after opening "Select Parent"`

### Step 3: `mark_present` as **inst**

```yaml
student: "Ali8c"
lesson: "Lesson 1"
mission: "Level 1"
activity: "intro"
branch: "Sim 8c Branch mclq"
```

**Error:** `clickButton: no button matching "Mark Ali8c as present" in snapshot`

### Step 4: `switch_to_shared` as **aa**

```yaml
student: "Ali8c"
branch: "Sim 8c Branch mclq"
```

**Error:** `switch_to_shared: no Edit button for student "Ali8c"`

### Step 5: `mark_offline_paid` as **ca**

```yaml
student: "Ali8c"
branch: "Sim 8c Branch mclq"
```

**Error:** `mark_offline_paid: student "Ali8c" not found in branch eeffc05c-5e07-4179-99b5-e84cc588b93e`

### Step 6: `approve_pending_payment` as **ca**

```yaml
student: "Ali8c"
branch: "Sim 8c Branch mclq"
```

**Error:** `approve_pending_payment: no pending-payment row for "Ali8c"`

## Fixtures

```json
{
  "runId": "mclqq0",
  "branchId": "eeffc05c-5e07-4179-99b5-e84cc588b93e",
  "branchName": "__sim_mclqq0_Sim 8c Branch",
  "courseId": "3e7964a1-a84b-4427-af08-8e9312981949",
  "courseName": "__sim_mclqq0_Course8c",
  "packageId": "59863bf0-970d-48b3-8dbd-d1c7cee4aa92",
  "users": [
    {
      "handle": "aa",
      "role": "assistant_admin",
      "id": "e569d815-d64c-42b9-90c5-1a65013b36dd",
      "email": "__sim_mclqq0_aa@sim.local",
      "profile": "lms-sim-mclqq0-aa",
      "password": "simpass"
    },
    {
      "handle": "inst",
      "role": "instructor",
      "id": "fc664287-8e86-4def-a847-a5d11f55fd1c",
      "email": "__sim_mclqq0_inst@sim.local",
      "profile": "lms-sim-mclqq0-inst",
      "password": "simpass"
    },
    {
      "handle": "ca",
      "role": "company_admin",
      "id": "a7199c2b-1885-4741-8216-925f1f267c46",
      "email": "__sim_mclqq0_ca@sim.local",
      "profile": "lms-sim-mclqq0-ca",
      "password": "simpass"
    }
  ],
  "createdVoucherCodes": [],
  "branchCity": "Sim 8c Branch mclq"
}
```