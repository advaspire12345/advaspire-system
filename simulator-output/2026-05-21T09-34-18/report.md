# Simulator report — scenario-8-separate-to-shared

**Run dir:** /Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-21T09-34-18
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
course: "__sim_gtsstx_Course8"
package: "4-session"
date_of_birth: "2016-02-10"
gender: "male"
school_name: "Sim School"
branch: "Sim S8 Branch gtss"
```

**Error:** `clickDialogButton("Save Student"): dialog still open with error → Parent email \p8@sim.local\ is already registered as a team member. Please use a different email.`

### Step 2: `mark_offline_paid` as **ca**

```yaml
student: "Abu8"
branch: "Sim S8 Branch gtss"
```

**Error:** `mark_offline_paid: student "Abu8" not found in branch 6a65b555-a9fc-4350-9baa-a7b3f9c9f726`

### Step 3: `approve_pending_payment` as **ca**

```yaml
student: "Abu8"
branch: "Sim S8 Branch gtss"
```

**Error:** `approve_pending_payment: no pending-payment row for "Abu8"`

### Step 4: `stamp_sessions_remaining` as **aa**

```yaml
student: "Abu8"
value: 10
branch: "Sim S8 Branch gtss"
```

**Error:** `stamp_sessions_remaining: student "Abu8" not found`

### Step 5: `add_student` as **aa**

```yaml
name: "Ali8"
parent_email: "p8@sim.local"
parent_existing: true
course: "__sim_gtsstx_Course8"
package: "4-session"
force_individual: true
date_of_birth: "2014-03-05"
gender: "male"
school_name: "Sim School"
branch: "Sim S8 Branch gtss"
```

**Error:** `selectByLabel: no option "p8@sim.local" after opening "Select Parent"`

### Step 6: `mark_offline_paid` as **ca**

```yaml
student: "Ali8"
branch: "Sim S8 Branch gtss"
```

**Error:** `mark_offline_paid: student "Ali8" not found in branch 6a65b555-a9fc-4350-9baa-a7b3f9c9f726`

### Step 7: `approve_pending_payment` as **ca**

```yaml
student: "Ali8"
branch: "Sim S8 Branch gtss"
```

**Error:** `approve_pending_payment: no pending-payment row for "Ali8"`

### Step 8: `stamp_sessions_remaining` as **aa**

```yaml
student: "Ali8"
value: 8
branch: "Sim S8 Branch gtss"
```

**Error:** `stamp_sessions_remaining: student "Ali8" not found`

### Step 9: `switch_to_shared` as **aa**

```yaml
student: "Ali8"
branch: "Sim S8 Branch gtss"
```

**Error:** `switch_to_shared: no Edit button for student "Ali8"`

## Fixtures

```json
{
  "runId": "gtsstx",
  "branchId": "6a65b555-a9fc-4350-9baa-a7b3f9c9f726",
  "branchName": "__sim_gtsstx_Sim S8 Branch",
  "courseId": "ce700f1a-27b5-462d-9180-2cbc8d1c51bd",
  "courseName": "__sim_gtsstx_Course8",
  "packageId": "200c58ef-2c96-49ff-b0f0-f09b067dc0b3",
  "users": [
    {
      "handle": "aa",
      "role": "assistant_admin",
      "id": "1de7dedf-697c-42a8-b51a-4d1ee35b4273",
      "email": "__sim_gtsstx_aa@sim.local",
      "profile": "lms-sim-gtsstx-aa",
      "password": "simpass"
    },
    {
      "handle": "inst",
      "role": "instructor",
      "id": "33353d98-87e1-4d69-b2af-462177cf55be",
      "email": "__sim_gtsstx_inst@sim.local",
      "profile": "lms-sim-gtsstx-inst",
      "password": "simpass"
    },
    {
      "handle": "ca",
      "role": "company_admin",
      "id": "3e119ad5-b6d8-4bf8-8611-f1e0b7f0fa1b",
      "email": "__sim_gtsstx_ca@sim.local",
      "profile": "lms-sim-gtsstx-ca",
      "password": "simpass"
    }
  ],
  "createdVoucherCodes": [],
  "branchCity": "Sim S8 Branch gtss"
}
```