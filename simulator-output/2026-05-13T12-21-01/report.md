# Simulator report — student-payment-then-sessions-update

**Run dir:** /Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-13T12-21-01
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
course: "__sim_k48yn5_PayPython"
package: "12-session"
date_of_birth: "2015-01-01"
gender: "male"
school_name: "Sim School"
branch: "Sim Pay Branch k48y"
```

**Error:** `clickDialogButton("Next"): dialog still open with error → *`

### Step 2: `mark_present` as **inst**

```yaml
student: "PaySimStu1"
lesson: "Lesson 1"
mission: "Level 1"
activity: "intro"
branch: "Sim Pay Branch k48y"
```

**Error:** `clickButton: no button matching "Mark PaySimStu1 as present" in snapshot`

### Step 3: `approve_pending_payment` as **ca**

```yaml
student: "PaySimStu1"
branch: "Sim Pay Branch k48y"
```

**Error:** `clickButton: no button matching "Approve payment for PaySimStu1" in snapshot`

## Fixtures

```json
{
  "runId": "k48yn5",
  "branchId": "c95e3b68-d4df-4fb1-b080-0f50e1a72c49",
  "branchName": "__sim_k48yn5_Sim Pay Branch",
  "courseId": "ea6aaa1c-8974-42f3-beb8-503ac0410d05",
  "courseName": "__sim_k48yn5_PayPython",
  "packageId": "8f8cd283-4490-4571-9c7b-4f6008e0876a",
  "users": [
    {
      "handle": "aa",
      "role": "assistant_admin",
      "id": "7b2afc47-97d2-425d-ba0f-b58e64895f1d",
      "email": "__sim_k48yn5_aa@sim.local",
      "profile": "lms-sim-k48yn5-aa",
      "password": "simpass"
    },
    {
      "handle": "inst",
      "role": "instructor",
      "id": "cfacda27-e340-46f0-82db-ea9b28f3609b",
      "email": "__sim_k48yn5_inst@sim.local",
      "profile": "lms-sim-k48yn5-inst",
      "password": "simpass"
    },
    {
      "handle": "ca",
      "role": "company_admin",
      "id": "59adfc6e-e640-43b2-a204-cdfe08a1fdda",
      "email": "__sim_k48yn5_ca@sim.local",
      "profile": "lms-sim-k48yn5-ca",
      "password": "simpass"
    }
  ],
  "createdVoucherCodes": [],
  "branchCity": "Sim Pay Branch k48y"
}
```