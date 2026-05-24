# Simulator report — scenario-import-pool

**Run dir:** /Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-18T14-48-08
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
branch: "Sim Imp Branch pu2j"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-18T14-48-08/screenshots/1-actor-sa.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-18T14-48-08/screenshots/1-observer-aa.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-18T14-48-08/screenshots/1-observer-ca.png`

## Fixtures

```json
{
  "runId": "pu2j1a",
  "branchId": "088274e0-235b-4b93-b54b-785792e8e1d3",
  "branchName": "__sim_pu2j1a_Sim Imp Branch",
  "courseId": "78f2a469-617b-49ab-a62f-a22d0744406d",
  "courseName": "__sim_pu2j1a_ImportCourse",
  "packageId": "a914cccd-6d16-4067-bed3-cb2298c4dd40",
  "users": [
    {
      "handle": "sa",
      "role": "super_admin",
      "id": "bf30f555-5955-48b9-b620-b8d17dfe3077",
      "email": "__sim_pu2j1a_sa@sim.local",
      "profile": "lms-sim-pu2j1a-sa",
      "password": "simpass"
    },
    {
      "handle": "aa",
      "role": "assistant_admin",
      "id": "8135e7e6-364a-4ff3-af9e-bc0d2ae3f899",
      "email": "__sim_pu2j1a_aa@sim.local",
      "profile": "lms-sim-pu2j1a-aa",
      "password": "simpass"
    },
    {
      "handle": "ca",
      "role": "company_admin",
      "id": "a0b5568f-1818-4f71-af37-224fc9740f05",
      "email": "__sim_pu2j1a_ca@sim.local",
      "profile": "lms-sim-pu2j1a-ca",
      "password": "simpass"
    }
  ],
  "createdVoucherCodes": [],
  "branchCity": "Sim Imp Branch pu2j"
}
```