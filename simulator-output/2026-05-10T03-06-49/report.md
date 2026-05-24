# Simulator report — attendance-before-payment-drift

**Run dir:** /Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-10T03-06-49
**Steps:** 2
**Drift findings:** 0

✅ All checkpoints passed.

## Full checkpoint table

| Step | Role | Field | DOM | DB | Expected | Result |
|------|------|-------|-----|-----|----------|--------|

## Per-step breakdown

### Step 1: `add_student` as **aa**

```yaml
name: "SimStu1"
parent_name: "Parent One"
parent_email: "p1@sim.local"
parent_phone: "0123456789"
course: "PythonSim"
package: "12-session"
date_of_birth: "2015-01-01"
gender: "male"
school_name: "Sim School"
```

**Error:** `fillLabel: no textbox "Full Name" in snapshot`

### Step 2: `mark_present` as **inst**

```yaml
student: "SimStu1"
lesson: "Lesson 1"
mission: "Level 1"
activity: "intro coding"
```

**Error:** `clickButton: no button "Present" in snapshot`

## Fixtures

```json
{
  "runId": "6c85gy",
  "branchId": "3dee7b9b-49e3-4560-b3eb-4b63a6d176ad",
  "courseId": "cdab31b0-5a3c-41d6-88ca-07f678ca4194",
  "packageId": "e6e043bb-8c80-4ef6-8383-613a1b67307a",
  "users": [
    {
      "handle": "aa",
      "role": "assistant_admin",
      "id": "9aea2f18-4eec-4fdd-ac7f-2e7b0bfec5b5",
      "email": "__sim_6c85gy_aa@sim.local",
      "profile": "lms-sim-6c85gy-aa",
      "password": "simpass"
    },
    {
      "handle": "inst",
      "role": "instructor",
      "id": "392c8237-997c-44da-8b78-a69f98d2e3af",
      "email": "__sim_6c85gy_inst@sim.local",
      "profile": "lms-sim-6c85gy-inst",
      "password": "simpass"
    },
    {
      "handle": "ca",
      "role": "company_admin",
      "id": "d5efdcd1-b371-448f-9b95-abc8b3baeb84",
      "email": "__sim_6c85gy_ca@sim.local",
      "profile": "lms-sim-6c85gy-ca",
      "password": "simpass"
    }
  ]
}
```