# Simulator report — scenario-import-pool

**Run dir:** /Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-21T08-59-13
**Steps:** 1
**Drift findings:** 0

✅ All checkpoints passed.

## Full checkpoint table

| Step | Role | Field | DOM | DB | Expected | Result |
|------|------|-------|-----|-----|----------|--------|
| 1 | assistant_admin | `/student.row_visible(AbuImp)` | true | — | true | ✅ |
| 1 | assistant_admin | `pool.active_students` | — | 2 | 2 | ✅ |
| 1 | assistant_admin | `enrollment.pool_id_set` | — | true | true | ✅ |
| 1 | company_admin | `/student.row_visible(AbuImp)` | true | — | true | ✅ |
| 1 | company_admin | `pool.active_students` | — | 2 | 2 | ✅ |
| 1 | company_admin | `enrollment.pool_id_set` | — | true | true | ✅ |

## Per-step breakdown

### Step 1: `import_students_csv` as **sa**

```yaml
student: "AbuImp"
rows: [{"student_name":"AliImp","date_of_birth":"2015-01-01","gender":"male","school_name":"Sim School","parent_name":"Imp Parent","parent_email":"imp.parent@sim.local","parent_phone":"0123450001","package_type":"session","package_duration":"4","schedule_day":"monday","schedule_time":"10:00","enrollment_status":"active","sessions_remaining":"0","share_with_sibling":""},{"student_name":"AbuImp","date_of_birth":"2017-01-01","gender":"male","school_name":"Sim School","parent_name":"Imp Parent","parent_email":"imp.parent@sim.local","parent_phone":"0123450001","package_type":"session","package_duration":"4","schedule_day":"monday","schedule_time":"10:00","enrollment_status":"active","sessions_remaining":"0","share_with_sibling":"true"}]
branch: "Sim Imp Branch 3bie"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-21T08-59-13/screenshots/1-actor-sa.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-21T08-59-13/screenshots/1-observer-aa.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-21T08-59-13/screenshots/1-observer-ca.png`

## Fixtures

```json
{
  "runId": "3bie64",
  "branchId": "780473f0-198c-48e9-8816-daf7fa186180",
  "branchName": "__sim_3bie64_Sim Imp Branch",
  "courseId": "153521c0-cfa9-48e6-9a21-3f400f12732f",
  "courseName": "__sim_3bie64_ImportCourse",
  "packageId": "5b48d1cd-33c3-4a07-8468-36c7344ccdd0",
  "users": [
    {
      "handle": "sa",
      "role": "super_admin",
      "id": "abd1e18f-3fb5-488d-83ba-48c647ca3ed4",
      "email": "__sim_3bie64_sa@sim.local",
      "profile": "lms-sim-3bie64-sa",
      "password": "simpass"
    },
    {
      "handle": "aa",
      "role": "assistant_admin",
      "id": "60c1a86e-acdb-460f-8deb-a97b4807ff50",
      "email": "__sim_3bie64_aa@sim.local",
      "profile": "lms-sim-3bie64-aa",
      "password": "simpass"
    },
    {
      "handle": "ca",
      "role": "company_admin",
      "id": "a2598314-6197-4200-8384-d9167a584b68",
      "email": "__sim_3bie64_ca@sim.local",
      "profile": "lms-sim-3bie64-ca",
      "password": "simpass"
    }
  ],
  "createdVoucherCodes": [],
  "branchCity": "Sim Imp Branch 3bie"
}
```