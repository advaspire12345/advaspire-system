# Simulator report — scenario-import-pool

**Run dir:** /Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-21T09-44-06
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
branch: "Sim Imp Branch 2xty"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-21T09-44-06/screenshots/1-actor-sa.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-21T09-44-06/screenshots/1-observer-aa.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-21T09-44-06/screenshots/1-observer-ca.png`

## Fixtures

```json
{
  "runId": "2xtyrf",
  "branchId": "90052bbb-b76f-4533-8ece-7f20fe37971e",
  "branchName": "__sim_2xtyrf_Sim Imp Branch",
  "courseId": "6f138584-d279-47c0-916a-c463d90a8ed7",
  "courseName": "__sim_2xtyrf_ImportCourse",
  "packageId": "4a9c77a8-a2bb-4be5-8d31-2943e139edf6",
  "users": [
    {
      "handle": "sa",
      "role": "super_admin",
      "id": "8377fb84-b8a6-4d17-85eb-30b1559a225b",
      "email": "__sim_2xtyrf_sa@sim.local",
      "profile": "lms-sim-2xtyrf-sa",
      "password": "simpass"
    },
    {
      "handle": "aa",
      "role": "assistant_admin",
      "id": "49c50be5-c4c5-4a2f-b919-c8faa5c227e7",
      "email": "__sim_2xtyrf_aa@sim.local",
      "profile": "lms-sim-2xtyrf-aa",
      "password": "simpass"
    },
    {
      "handle": "ca",
      "role": "company_admin",
      "id": "c3a980b2-2cf3-4e7d-ad58-04a023339395",
      "email": "__sim_2xtyrf_ca@sim.local",
      "profile": "lms-sim-2xtyrf-ca",
      "password": "simpass"
    }
  ],
  "createdVoucherCodes": [],
  "branchCity": "Sim Imp Branch 2xty"
}
```