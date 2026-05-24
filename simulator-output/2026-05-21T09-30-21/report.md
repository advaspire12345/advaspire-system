# Simulator report — scenario-8-separate-to-shared

**Run dir:** /Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-21T09-30-21
**Steps:** 9
**Drift findings:** 0

✅ All checkpoints passed.

## Full checkpoint table

| Step | Role | Field | DOM | DB | Expected | Result |
|------|------|-------|-----|-----|----------|--------|

## Per-step breakdown

### Step 1: `add_student` as **aa**

```yaml
name: "Abu8"
parent_name: "S8 Parent"
parent_email: "p8@sim.local"
parent_phone: "0123450081"
course: "__sim_49sllc_Course8"
package: "4-session"
date_of_birth: "2016-02-10"
gender: "male"
school_name: "Sim School"
branch: "Sim S8 Branch 49sl"
```

**Error:** `clickDialogButton("Save Student"): dialog still open with error → Parent email \p8@sim.local\ is already registered as a team member. Please use a different email.`

### Step 2: `mark_offline_paid` as **ca**

```yaml
student: "Abu8"
branch: "Sim S8 Branch 49sl"
```

**Error:** `mark_offline_paid: student "Abu8" not found in branch e1505725-2761-455b-b931-5ea73ac66b60`

### Step 3: `approve_pending_payment` as **ca**

```yaml
student: "Abu8"
branch: "Sim S8 Branch 49sl"
```

**Error:** `approve_pending_payment: no pending-payment row for "Abu8"`

### Step 4: `stamp_sessions_remaining` as **aa**

```yaml
student: "Abu8"
value: 10
branch: "Sim S8 Branch 49sl"
```

**Error:** `stamp_sessions_remaining: student "Abu8" not found`

### Step 5: `add_student` as **aa**

```yaml
name: "Ali8"
parent_email: "p8@sim.local"
parent_existing: true
course: "__sim_49sllc_Course8"
package: "4-session"
force_individual: true
date_of_birth: "2014-03-05"
gender: "male"
school_name: "Sim School"
branch: "Sim S8 Branch 49sl"
```

**Error:** `selectByLabel: no option "p8@sim.local" after opening "Select Parent"`

### Step 6: `mark_offline_paid` as **ca**

```yaml
student: "Ali8"
branch: "Sim S8 Branch 49sl"
```

**Error:** `mark_offline_paid: student "Ali8" not found in branch e1505725-2761-455b-b931-5ea73ac66b60`

### Step 7: `approve_pending_payment` as **ca**

```yaml
student: "Ali8"
branch: "Sim S8 Branch 49sl"
```

**Error:** `approve_pending_payment: no pending-payment row for "Ali8"`

### Step 8: `stamp_sessions_remaining` as **aa**

```yaml
student: "Ali8"
value: 8
branch: "Sim S8 Branch 49sl"
```

**Error:** `stamp_sessions_remaining: student "Ali8" not found`

### Step 9: `switch_to_shared` as **aa**

```yaml
student: "Ali8"
branch: "Sim S8 Branch 49sl"
```

**Error:** `switch_to_shared: no Edit button for student "Ali8"`

## Fixtures

```json
{
  "runId": "49sllc",
  "branchId": "e1505725-2761-455b-b931-5ea73ac66b60",
  "branchName": "__sim_49sllc_Sim S8 Branch",
  "courseId": "5995d047-0acd-4ba6-b11c-795ece4fb5d2",
  "courseName": "__sim_49sllc_Course8",
  "packageId": "5874ddd0-c149-4c81-8b7a-fdc8386720f7",
  "users": [
    {
      "handle": "aa",
      "role": "assistant_admin",
      "id": "35520c1a-7dda-4989-9d42-1ffa9ac03fd4",
      "email": "__sim_49sllc_aa@sim.local",
      "profile": "lms-sim-49sllc-aa",
      "password": "simpass"
    },
    {
      "handle": "inst",
      "role": "instructor",
      "id": "37071613-7b6f-4d3d-80d0-fea37189ca2d",
      "email": "__sim_49sllc_inst@sim.local",
      "profile": "lms-sim-49sllc-inst",
      "password": "simpass"
    },
    {
      "handle": "ca",
      "role": "company_admin",
      "id": "807fc482-f23b-43c5-a0d8-3c79a1ac682c",
      "email": "__sim_49sllc_ca@sim.local",
      "profile": "lms-sim-49sllc-ca",
      "password": "simpass"
    }
  ],
  "createdVoucherCodes": [],
  "branchCity": "Sim S8 Branch 49sl"
}
```