# Simulator report — student-payment-then-sessions-update

**Run dir:** /Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-13T11-32-01
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
course: "__sim_kpdjc9_PayPython"
package: "12-session"
date_of_birth: "2015-01-01"
gender: "male"
school_name: "Sim School"
branch: "Sim Pay Branch kpdj"
```

**Error:** `fillLabel: no input "Full Name" in snapshot`

### Step 2: `mark_present` as **inst**

```yaml
student: "PaySimStu1"
lesson: "Lesson 1"
mission: "Level 1"
activity: "intro"
branch: "Sim Pay Branch kpdj"
```

**Error:** `clickButton: no button matching "Mark PaySimStu1 as present" in snapshot`

### Step 3: `approve_pending_payment` as **ca**

```yaml
student: "PaySimStu1"
branch: "Sim Pay Branch kpdj"
```

**Error:** `clickButton: no button matching "Approve payment for PaySimStu1" in snapshot`

## Fixtures

```json
{
  "runId": "kpdjc9",
  "branchId": "e60788c8-8dd8-4d41-8d38-442b2c2b5fea",
  "branchName": "__sim_kpdjc9_Sim Pay Branch",
  "courseId": "d760ab41-31aa-430d-bb79-27bbc3fba558",
  "courseName": "__sim_kpdjc9_PayPython",
  "packageId": "d86a38aa-544c-48a9-b3cd-23d1cd9fd658",
  "users": [
    {
      "handle": "aa",
      "role": "assistant_admin",
      "id": "55c32076-0674-4d9f-b2f2-7b4e0748f6b9",
      "email": "__sim_kpdjc9_aa@sim.local",
      "profile": "lms-sim-kpdjc9-aa",
      "password": "simpass"
    },
    {
      "handle": "inst",
      "role": "instructor",
      "id": "d1bbad11-01fd-4910-9a1c-5f2ae3d6d307",
      "email": "__sim_kpdjc9_inst@sim.local",
      "profile": "lms-sim-kpdjc9-inst",
      "password": "simpass"
    },
    {
      "handle": "ca",
      "role": "company_admin",
      "id": "a4c7ad7e-d8f2-44d9-acf7-8b8f4ef7687d",
      "email": "__sim_kpdjc9_ca@sim.local",
      "profile": "lms-sim-kpdjc9-ca",
      "password": "simpass"
    }
  ],
  "createdVoucherCodes": [],
  "branchCity": "Sim Pay Branch kpdj"
}
```