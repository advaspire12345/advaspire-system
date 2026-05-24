# Simulator report — scenario-import-pool

**Run dir:** /Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-21T09-28-55
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
branch: "Sim Imp Branch wft1"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-21T09-28-55/screenshots/1-actor-sa.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-21T09-28-55/screenshots/1-observer-aa.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-21T09-28-55/screenshots/1-observer-ca.png`

## Fixtures

```json
{
  "runId": "wft1v2",
  "branchId": "5001874b-a5f8-4504-917a-be29111a2673",
  "branchName": "__sim_wft1v2_Sim Imp Branch",
  "courseId": "950c869e-2d62-485f-b578-a9b7f8519c17",
  "courseName": "__sim_wft1v2_ImportCourse",
  "packageId": "7eefa496-1d5c-4037-bcba-2d78ce586a90",
  "users": [
    {
      "handle": "sa",
      "role": "super_admin",
      "id": "1e0f09fe-983b-4e1c-9580-6955046376c6",
      "email": "__sim_wft1v2_sa@sim.local",
      "profile": "lms-sim-wft1v2-sa",
      "password": "simpass"
    },
    {
      "handle": "aa",
      "role": "assistant_admin",
      "id": "74aca0c7-be26-4917-8e4a-aba1ac5e3c06",
      "email": "__sim_wft1v2_aa@sim.local",
      "profile": "lms-sim-wft1v2-aa",
      "password": "simpass"
    },
    {
      "handle": "ca",
      "role": "company_admin",
      "id": "db7c9750-52e9-420d-a4ea-fab04ef560f0",
      "email": "__sim_wft1v2_ca@sim.local",
      "profile": "lms-sim-wft1v2-ca",
      "password": "simpass"
    }
  ],
  "createdVoucherCodes": [],
  "branchCity": "Sim Imp Branch wft1"
}
```