# Simulator report — examination-auto-levelup-tolerance

**Run dir:** /Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-28T08-19-27
**Steps:** 5
**Drift findings:** 0

✅ All checkpoints passed.

## Full checkpoint table

| Step | Role | Field | DOM | DB | Expected | Result |
|------|------|-------|-----|-----|----------|--------|

## Per-step breakdown

### Step 1: `add_student` as **aa**

```yaml
name: "Aiman"
parent_name: "Exam Parent"
parent_email: "examp@sim.local"
parent_phone: "0123450099"
course: "__sim_wiet5e_ExamCourse"
package: "4-session"
date_of_birth: "2015-01-01"
gender: "male"
school_name: "Sim School"
branch: "Sim Exam Branch wiet"
```

**Error:** `selectByLabel: no combobox "Select Parent" in snapshot`

### Step 2: `mark_offline_paid` as **ca**

```yaml
student: "Aiman"
branch: "Sim Exam Branch wiet"
```

**Error:** `mark_offline_paid: student "Aiman" not found in branch a458e4b1-2571-4a05-bd37-cd4825f0f3e9`

### Step 3: `approve_pending_payment` as **ca**

```yaml
student: "Aiman"
branch: "Sim Exam Branch wiet"
```

**Error:** `approve_pending_payment: no pending-payment row for "Aiman"`

### Step 4: `mark_present` as **inst**

```yaml
student: "Aiman"
lesson: "Lesson 1"
mission: "Level 1"
activity: "intro"
branch: "Sim Exam Branch wiet"
```

**Error:** `clickButton: no button matching "Mark Aiman as present" in snapshot`

### Step 5: `mark_present` as **inst**

```yaml
student: "Aiman"
lesson: "Lesson 2"
mission: "Level 1"
activity: "build"
branch: "Sim Exam Branch wiet"
```

**Error:** `clickButton: no button matching "Mark Aiman as present" in snapshot`

## Fixtures

```json
{
  "runId": "wiet5e",
  "branchId": "a458e4b1-2571-4a05-bd37-cd4825f0f3e9",
  "branchName": "__sim_wiet5e_Sim Exam Branch",
  "courseId": "f447eab2-fb07-42e5-9d21-6a502b33be1e",
  "courseName": "__sim_wiet5e_ExamCourse",
  "packageId": "ade9cf7d-d705-4ab0-ae89-90ac12c4be25",
  "users": [
    {
      "handle": "aa",
      "role": "assistant_admin",
      "id": "b117a56b-55fb-4f49-ae62-fc45d90d4fa3",
      "email": "__sim_wiet5e_aa@sim.local",
      "profile": "lms-sim-wiet5e-aa",
      "password": "simpass"
    },
    {
      "handle": "inst",
      "role": "instructor",
      "id": "3c70754e-17ac-459b-9699-c5033ed2cf5b",
      "email": "__sim_wiet5e_inst@sim.local",
      "profile": "lms-sim-wiet5e-inst",
      "password": "simpass"
    },
    {
      "handle": "ca",
      "role": "company_admin",
      "id": "0b53d592-2cfa-4a15-9128-2b804645364c",
      "email": "__sim_wiet5e_ca@sim.local",
      "profile": "lms-sim-wiet5e-ca",
      "password": "simpass"
    }
  ],
  "createdVoucherCodes": [],
  "branchCity": "Sim Exam Branch wiet"
}
```