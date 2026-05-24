# Simulator report — scenario-import-pool

**Run dir:** /Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-19T09-38-39
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
branch: "Sim Imp Branch 0hmq"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-19T09-38-39/screenshots/1-actor-sa.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-19T09-38-39/screenshots/1-observer-aa.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-19T09-38-39/screenshots/1-observer-ca.png`

## Fixtures

```json
{
  "runId": "0hmq1b",
  "branchId": "f9b3b241-f47b-43cd-bad6-aaf75ebd5e97",
  "branchName": "__sim_0hmq1b_Sim Imp Branch",
  "courseId": "f23ebe6b-9c61-4593-9b90-8b426c269ecf",
  "courseName": "__sim_0hmq1b_ImportCourse",
  "packageId": "e80f9402-d139-4fa1-8d6a-a0361a8ba11b",
  "users": [
    {
      "handle": "sa",
      "role": "super_admin",
      "id": "85c9d7c5-2dbc-4c11-9192-032c3dce627a",
      "email": "__sim_0hmq1b_sa@sim.local",
      "profile": "lms-sim-0hmq1b-sa",
      "password": "simpass"
    },
    {
      "handle": "aa",
      "role": "assistant_admin",
      "id": "8500eaed-3493-4bf5-8baf-51a0371d0fb9",
      "email": "__sim_0hmq1b_aa@sim.local",
      "profile": "lms-sim-0hmq1b-aa",
      "password": "simpass"
    },
    {
      "handle": "ca",
      "role": "company_admin",
      "id": "6434a6f3-a5be-4e02-9a7e-4405f5118b3c",
      "email": "__sim_0hmq1b_ca@sim.local",
      "profile": "lms-sim-0hmq1b-ca",
      "password": "simpass"
    }
  ],
  "createdVoucherCodes": [],
  "branchCity": "Sim Imp Branch 0hmq"
}
```