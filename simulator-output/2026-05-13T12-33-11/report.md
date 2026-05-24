# Simulator report — student-payment-then-sessions-update

**Run dir:** /Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-13T12-33-11
**Steps:** 3
**Drift findings:** 0

✅ All checkpoints passed.

## Full checkpoint table

| Step | Role | Field | DOM | DB | Expected | Result |
|------|------|-------|-----|-----|----------|--------|

## Per-step breakdown

### Step 1: `add_student` as **aa**

```yaml
name: "PaySimStu1"
parent_name: "Pay Parent 1"
parent_email: "pp1@sim.local"
parent_phone: "0123456789"
course: "__sim_4qx04i_PayPython"
package: "12-session"
date_of_birth: "2015-01-01"
gender: "male"
school_name: "Sim School"
branch: "Sim Pay Branch 4qx0"
```

**Error:** `clickDialogButton("Next"): dialog still open with error → *`

### Step 2: `mark_present` as **inst**

```yaml
student: "PaySimStu1"
lesson: "Lesson 1"
mission: "Level 1"
activity: "intro"
branch: "Sim Pay Branch 4qx0"
```

**Error:** `clickButton: no button matching "Mark PaySimStu1 as present" in snapshot`

### Step 3: `approve_pending_payment` as **ca**

```yaml
student: "PaySimStu1"
branch: "Sim Pay Branch 4qx0"
```

**Error:** `clickButton: no button matching "Approve payment for PaySimStu1" in snapshot`

## Fixtures

```json
{
  "runId": "4qx04i",
  "branchId": "156f7315-2fde-41f0-81ab-1e4184fbd1ca",
  "branchName": "__sim_4qx04i_Sim Pay Branch",
  "courseId": "0c5ac368-f877-4c86-b6cc-b00dab84d290",
  "courseName": "__sim_4qx04i_PayPython",
  "packageId": "502acd75-3fa7-4554-80b6-89ac4df2701b",
  "users": [
    {
      "handle": "aa",
      "role": "assistant_admin",
      "id": "09e6a738-f39c-4903-8a6d-23a9910d5a14",
      "email": "__sim_4qx04i_aa@sim.local",
      "profile": "lms-sim-4qx04i-aa",
      "password": "simpass"
    },
    {
      "handle": "inst",
      "role": "instructor",
      "id": "5abd2dc1-fb28-42f0-a384-b20cd07ea466",
      "email": "__sim_4qx04i_inst@sim.local",
      "profile": "lms-sim-4qx04i-inst",
      "password": "simpass"
    },
    {
      "handle": "ca",
      "role": "company_admin",
      "id": "41f610f2-0bb8-47b6-9d5a-7ef49cfaa3a3",
      "email": "__sim_4qx04i_ca@sim.local",
      "profile": "lms-sim-4qx04i-ca",
      "password": "simpass"
    }
  ],
  "createdVoucherCodes": [],
  "branchCity": "Sim Pay Branch 4qx0"
}
```