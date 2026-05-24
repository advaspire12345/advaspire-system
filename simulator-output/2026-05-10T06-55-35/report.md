# Simulator report — trial-mark-present-completes

**Run dir:** /Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-10T06-55-35
**Steps:** 2
**Drift findings:** 0

✅ All checkpoints passed.

## Full checkpoint table

| Step | Role | Field | DOM | DB | Expected | Result |
|------|------|-------|-----|-----|----------|--------|

## Per-step breakdown

### Step 1: `add_trial` as **ca**

```yaml
parent_name: "Trial Parent 1"
parent_email: "tp1@sim.local"
parent_phone: "0123456781"
child_name: "TrialKid1"
child_age: 8
course: "__sim_tl4gxb_TrialPython"
scheduled_date: "2026-05-10"
scheduled_time: "17:00"
source: "website"
branch: "Sim Trial Branch"
```

**Error:** `add_trial: submit clicked but no trial with child_name="TrialKid1" appeared in the DB. Form validation likely rejected silently (most common: branch/course state didn't propagate; or duplicate phone).`

### Step 2: `mark_present` as **inst**

```yaml
student: "TrialKid1 (Trial)"
lesson: "Lesson 1"
mission: "Level 1"
activity: "trial intro"
branch: "Sim Trial Branch"
```

**Error:** `clickButton: no button "Mark TrialKid1 (Trial) as present" in snapshot`

## Fixtures

```json
{
  "runId": "tl4gxb",
  "branchId": "70abc5f2-c437-4416-89d7-5f7db147ffb7",
  "branchName": "__sim_tl4gxb_Sim Trial Branch",
  "courseId": "311e4efe-db52-45e5-a80f-15bd06bffd52",
  "courseName": "__sim_tl4gxb_TrialPython",
  "packageId": "4d47ab82-6a07-4217-bcf2-5fee8abefa3d",
  "users": [
    {
      "handle": "ca",
      "role": "company_admin",
      "id": "81dace6e-2f7d-4f3a-a333-2094d08308d1",
      "email": "__sim_tl4gxb_ca@sim.local",
      "profile": "lms-sim-tl4gxb-ca",
      "password": "simpass"
    },
    {
      "handle": "aa",
      "role": "assistant_admin",
      "id": "f8d21786-5baa-45c7-8687-e496182e98bf",
      "email": "__sim_tl4gxb_aa@sim.local",
      "profile": "lms-sim-tl4gxb-aa",
      "password": "simpass"
    },
    {
      "handle": "inst",
      "role": "instructor",
      "id": "3fb43496-71da-46f8-a53e-e9d6bed28842",
      "email": "__sim_tl4gxb_inst@sim.local",
      "profile": "lms-sim-tl4gxb-inst",
      "password": "simpass"
    }
  ],
  "createdVoucherCodes": [],
  "branchCity": "Sim Trial Branch"
}
```