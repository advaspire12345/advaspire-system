# Simulator report — scenario-8c-individual-to-shared-negative

**Run dir:** /Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-14T13-41-26
**Steps:** 6
**Drift findings:** 0

✅ All checkpoints passed.

## Full checkpoint table

| Step | Role | Field | DOM | DB | Expected | Result |
|------|------|-------|-----|-----|----------|--------|

## Per-step breakdown

### Step 1: `add_student` as **aa**

```yaml
name: "Abu8c"
parent_name: "8c Parent"
parent_email: "p8c@sim.local"
parent_phone: "0123450080"
course: "__sim_jreyzf_Course8c"
package: "4-session"
date_of_birth: "2016-02-10"
gender: "male"
school_name: "Sim School"
branch: "Sim 8c Branch jrey"
```

**Error:** `clickDialogButton("Save Student"): dialog still open with error → Parent email \p8c@sim.local\ is already registered as a team member. Please use a different email.`

### Step 2: `add_student` as **aa**

```yaml
name: "Ali8c"
parent_email: "p8c@sim.local"
parent_existing: true
course: "__sim_jreyzf_Course8c"
package: "4-session"
force_individual: true
date_of_birth: "2014-03-05"
gender: "male"
school_name: "Sim School"
branch: "Sim 8c Branch jrey"
```

**Error:** `selectByLabel: no option "p8c@sim.local" after opening "Select Parent"`

### Step 3: `mark_present` as **inst**

```yaml
student: "Ali8c"
lesson: "Lesson 1"
mission: "Level 1"
activity: "intro"
branch: "Sim 8c Branch jrey"
```

**Error:** `clickButton: no button matching "Mark Ali8c as present" in snapshot`

### Step 4: `switch_to_shared` as **aa**

```yaml
student: "Ali8c"
branch: "Sim 8c Branch jrey"
```

**Error:** `switch_to_shared: no Edit button for student "Ali8c"`

### Step 5: `mark_offline_paid` as **ca**

```yaml
student: "Ali8c"
branch: "Sim 8c Branch jrey"
```

**Error:** `mark_offline_paid: student "Ali8c" not found in branch 4b61b403-dc4a-43cf-b935-58ea1c70ab0e`

### Step 6: `approve_pending_payment` as **ca**

```yaml
student: "Ali8c"
branch: "Sim 8c Branch jrey"
```

**Error:** `approve_pending_payment: no pending-payment row for "Ali8c"`

## Fixtures

```json
{
  "runId": "jreyzf",
  "branchId": "4b61b403-dc4a-43cf-b935-58ea1c70ab0e",
  "branchName": "__sim_jreyzf_Sim 8c Branch",
  "courseId": "a1b57b83-4e7b-4f1c-bef0-2cd96624b1b9",
  "courseName": "__sim_jreyzf_Course8c",
  "packageId": "97b956a6-9274-4733-a9d1-4fed0d013c61",
  "users": [
    {
      "handle": "aa",
      "role": "assistant_admin",
      "id": "b5602beb-09ae-40db-82a2-4d9ae03ea682",
      "email": "__sim_jreyzf_aa@sim.local",
      "profile": "lms-sim-jreyzf-aa",
      "password": "simpass"
    },
    {
      "handle": "inst",
      "role": "instructor",
      "id": "78104c86-858b-4d47-8b0f-3d77bebcceb2",
      "email": "__sim_jreyzf_inst@sim.local",
      "profile": "lms-sim-jreyzf-inst",
      "password": "simpass"
    },
    {
      "handle": "ca",
      "role": "company_admin",
      "id": "e9989eaf-22ad-48e6-a4c6-0d11c7c8c542",
      "email": "__sim_jreyzf_ca@sim.local",
      "profile": "lms-sim-jreyzf-ca",
      "password": "simpass"
    }
  ],
  "createdVoucherCodes": [],
  "branchCity": "Sim 8c Branch jrey"
}
```