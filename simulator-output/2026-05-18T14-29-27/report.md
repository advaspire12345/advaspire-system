# Simulator report — scenario-import-pool

**Run dir:** /Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-18T14-29-27
**Steps:** 1
**Drift findings:** 0

✅ All checkpoints passed.

## Full checkpoint table

| Step | Role | Field | DOM | DB | Expected | Result |
|------|------|-------|-----|-----|----------|--------|

## Per-step breakdown

### Step 1: `import_students_csv` as **sa**

```yaml
student: "AbuImp"
rows: [{"student_name":"AliImp","date_of_birth":"2015-01-01","gender":"male","school_name":"Sim School","parent_name":"Imp Parent","parent_email":"imp.parent@sim.local","parent_phone":"0123450001","package_type":"session","package_duration":"4","schedule_day":"monday","schedule_time":"10:00","enrollment_status":"active","sessions_remaining":"0","share_with_sibling":""},{"student_name":"AbuImp","date_of_birth":"2017-01-01","gender":"male","school_name":"Sim School","parent_name":"Imp Parent","parent_email":"imp.parent@sim.local","parent_phone":"0123450001","package_type":"session","package_duration":"4","schedule_day":"monday","schedule_time":"10:00","enrollment_status":"active","sessions_remaining":"0","share_with_sibling":"true"}]
branch: "Sim Imp Branch fqum"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-18T14-29-27/screenshots/1-actor-sa.png`

## Fixtures

```json
{
  "runId": "fqumrf",
  "branchId": "ad9b3514-5a2e-49cb-ae0b-e903591a1018",
  "branchName": "__sim_fqumrf_Sim Imp Branch",
  "courseId": "711993d9-7155-4b3e-8031-b8fb916e0a0a",
  "courseName": "__sim_fqumrf_ImportCourse",
  "packageId": "8549c8d7-cf85-4c6c-a6b5-41e8347665a3",
  "users": [
    {
      "handle": "sa",
      "role": "super_admin",
      "id": "2c306b6d-eb52-4a1c-92cb-f15afd2913b9",
      "email": "__sim_fqumrf_sa@sim.local",
      "profile": "lms-sim-fqumrf-sa",
      "password": "simpass"
    }
  ],
  "createdVoucherCodes": [],
  "branchCity": "Sim Imp Branch fqum"
}
```