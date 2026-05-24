# Simulator report — student-payment-then-sessions-update

**Run dir:** /Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-13T11-37-17
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
course: "__sim_6893g5_PayPython"
package: "12-session"
date_of_birth: "2015-01-01"
gender: "male"
school_name: "Sim School"
branch: "Sim Pay Branch 6893"
```

**Error:** `clickDialogButton: no enabled button "Session" inside dialog`

### Step 2: `mark_present` as **inst**

```yaml
student: "PaySimStu1"
lesson: "Lesson 1"
mission: "Level 1"
activity: "intro"
branch: "Sim Pay Branch 6893"
```

**Error:** `clickButton: no button matching "Mark PaySimStu1 as present" in snapshot`

### Step 3: `approve_pending_payment` as **ca**

```yaml
student: "PaySimStu1"
branch: "Sim Pay Branch 6893"
```

**Error:** `clickButton: no button matching "Approve payment for PaySimStu1" in snapshot`

## Fixtures

```json
{
  "runId": "6893g5",
  "branchId": "1d4e2af1-7524-4a05-8b38-88603482ed3a",
  "branchName": "__sim_6893g5_Sim Pay Branch",
  "courseId": "18963687-92f7-4064-a705-2d4ce594a9d2",
  "courseName": "__sim_6893g5_PayPython",
  "packageId": "5a4217e9-c433-4f38-8d74-b8e18324fde5",
  "users": [
    {
      "handle": "aa",
      "role": "assistant_admin",
      "id": "e8d3d330-c1ee-4d2d-99f1-acfd137a8693",
      "email": "__sim_6893g5_aa@sim.local",
      "profile": "lms-sim-6893g5-aa",
      "password": "simpass"
    },
    {
      "handle": "inst",
      "role": "instructor",
      "id": "402c93e0-b1f3-4fd1-8f4b-487985cf6065",
      "email": "__sim_6893g5_inst@sim.local",
      "profile": "lms-sim-6893g5-inst",
      "password": "simpass"
    },
    {
      "handle": "ca",
      "role": "company_admin",
      "id": "65bd067e-48db-46c7-84e2-78983411bc80",
      "email": "__sim_6893g5_ca@sim.local",
      "profile": "lms-sim-6893g5-ca",
      "password": "simpass"
    }
  ],
  "createdVoucherCodes": [],
  "branchCity": "Sim Pay Branch 6893"
}
```