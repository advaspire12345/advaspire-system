# Simulator report — attendance-before-payment-drift

**Run dir:** /Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-10T03-09-13
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

**Error:** `clickButton: no button "Mark SimStu1 as present" in snapshot`

## Fixtures

```json
{
  "runId": "q6s1rc",
  "branchId": "c0470d54-6633-491c-b7dd-9ce0d19d43bd",
  "courseId": "49180d13-c5a1-41a4-91b6-4aa4485987da",
  "packageId": "4f706edb-2d8e-4a2b-b206-ac546e4bd80d",
  "users": [
    {
      "handle": "aa",
      "role": "assistant_admin",
      "id": "fb479754-55be-4dda-aa7f-0172a3b7c010",
      "email": "__sim_q6s1rc_aa@sim.local",
      "profile": "lms-sim-q6s1rc-aa",
      "password": "simpass"
    },
    {
      "handle": "inst",
      "role": "instructor",
      "id": "fab51e72-c403-4837-b032-fc34be17a998",
      "email": "__sim_q6s1rc_inst@sim.local",
      "profile": "lms-sim-q6s1rc-inst",
      "password": "simpass"
    },
    {
      "handle": "ca",
      "role": "company_admin",
      "id": "28ae2609-e2cf-4575-8a9c-663d51ab9d7c",
      "email": "__sim_q6s1rc_ca@sim.local",
      "profile": "lms-sim-q6s1rc-ca",
      "password": "simpass"
    }
  ]
}
```