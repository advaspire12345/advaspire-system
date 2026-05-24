# Simulator report — student-payment-then-sessions-update

**Run dir:** /Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-13T12-35-23
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
course: "__sim_xpmcd2_PayPython"
package: "12-session"
date_of_birth: "2015-01-01"
gender: "male"
school_name: "Sim School"
branch: "Sim Pay Branch xpmc"
```

**Error:** `clickDialogButton("Save Student"): dialog still open with error → Parent email \pp1@sim.local\ is already registered as a team member. Please use a different email.`

### Step 2: `mark_present` as **inst**

```yaml
student: "PaySimStu1"
lesson: "Lesson 1"
mission: "Level 1"
activity: "intro"
branch: "Sim Pay Branch xpmc"
```

**Error:** `clickButton: no button matching "Mark PaySimStu1 as present" in snapshot`

### Step 3: `approve_pending_payment` as **ca**

```yaml
student: "PaySimStu1"
branch: "Sim Pay Branch xpmc"
```

**Error:** `clickButton: no button matching "Approve payment for PaySimStu1" in snapshot`

## Fixtures

```json
{
  "runId": "xpmcd2",
  "branchId": "72fc9acb-8e94-4dd6-be6a-fab078c32493",
  "branchName": "__sim_xpmcd2_Sim Pay Branch",
  "courseId": "736bf50e-f03a-4832-9fb1-7247b6f26615",
  "courseName": "__sim_xpmcd2_PayPython",
  "packageId": "d92712dd-c246-462f-87b6-0efd1682bac7",
  "users": [
    {
      "handle": "aa",
      "role": "assistant_admin",
      "id": "0651ff39-a6f1-42b5-bb0f-f0decab1897d",
      "email": "__sim_xpmcd2_aa@sim.local",
      "profile": "lms-sim-xpmcd2-aa",
      "password": "simpass"
    },
    {
      "handle": "inst",
      "role": "instructor",
      "id": "0c4744a1-99ba-4385-9b72-73af8adf3883",
      "email": "__sim_xpmcd2_inst@sim.local",
      "profile": "lms-sim-xpmcd2-inst",
      "password": "simpass"
    },
    {
      "handle": "ca",
      "role": "company_admin",
      "id": "62ad6fc5-c118-424d-b9e7-b446bbf4ed87",
      "email": "__sim_xpmcd2_ca@sim.local",
      "profile": "lms-sim-xpmcd2-ca",
      "password": "simpass"
    }
  ],
  "createdVoucherCodes": [],
  "branchCity": "Sim Pay Branch xpmc"
}
```