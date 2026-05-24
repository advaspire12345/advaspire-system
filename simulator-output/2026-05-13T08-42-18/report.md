# Simulator report — student-payment-then-sessions-update

**Run dir:** /Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-13T08-42-18
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
course: "__sim_ijzsfd_PayPython"
package: "12-session"
date_of_birth: "2015-01-01"
gender: "male"
school_name: "Sim School"
branch: "Sim Pay Branch ijzs"
```

**Error:** `fillLabel: no input "Full Name" in snapshot`

### Step 2: `mark_present` as **inst**

```yaml
student: "PaySimStu1"
lesson: "Lesson 1"
mission: "Level 1"
activity: "intro"
branch: "Sim Pay Branch ijzs"
```

**Error:** `clickButton: no button matching "Mark PaySimStu1 as present" in snapshot`

### Step 3: `approve_pending_payment` as **ca**

```yaml
student: "PaySimStu1"
branch: "Sim Pay Branch ijzs"
```

**Error:** `clickButton: no button matching "Approve payment for PaySimStu1" in snapshot`

## Fixtures

```json
{
  "runId": "ijzsfd",
  "branchId": "8d14872a-2cad-4db9-bc04-020bcfcb578b",
  "branchName": "__sim_ijzsfd_Sim Pay Branch",
  "courseId": "b5ce6b14-129c-47e9-bc0b-d23c62f37e8f",
  "courseName": "__sim_ijzsfd_PayPython",
  "packageId": "d45858a5-187b-4bc9-88ff-c238b6cef42d",
  "users": [
    {
      "handle": "aa",
      "role": "assistant_admin",
      "id": "ecd29a9b-fb7c-4642-b6fd-9241e402918d",
      "email": "__sim_ijzsfd_aa@sim.local",
      "profile": "lms-sim-ijzsfd-aa",
      "password": "simpass"
    },
    {
      "handle": "inst",
      "role": "instructor",
      "id": "72ac4c60-cfc0-48b9-8dfc-23a696d8d18e",
      "email": "__sim_ijzsfd_inst@sim.local",
      "profile": "lms-sim-ijzsfd-inst",
      "password": "simpass"
    },
    {
      "handle": "ca",
      "role": "company_admin",
      "id": "9ff9dd5b-f92f-44fc-9b9f-6de98312d505",
      "email": "__sim_ijzsfd_ca@sim.local",
      "profile": "lms-sim-ijzsfd-ca",
      "password": "simpass"
    }
  ],
  "createdVoucherCodes": [],
  "branchCity": "Sim Pay Branch ijzs"
}
```