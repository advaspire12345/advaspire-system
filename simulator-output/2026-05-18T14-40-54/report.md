# Simulator report — scenario-import-pool

**Run dir:** /Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-18T14-40-54
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
branch: "Sim Imp Branch 053m"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-18T14-40-54/screenshots/1-actor-sa.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-18T14-40-54/screenshots/1-observer-aa.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-18T14-40-54/screenshots/1-observer-ca.png`

## Fixtures

```json
{
  "runId": "053ma1",
  "branchId": "4bef81f5-c2f1-46f4-a677-5ebe2f01a50c",
  "branchName": "__sim_053ma1_Sim Imp Branch",
  "courseId": "148db60f-fad9-4501-ab81-8b314d06eb63",
  "courseName": "__sim_053ma1_ImportCourse",
  "packageId": "a6cbfce6-e051-4e19-99da-4c3c16c0aa98",
  "users": [
    {
      "handle": "sa",
      "role": "super_admin",
      "id": "b39f5bfe-52e5-4f3f-9929-ab470d65b549",
      "email": "__sim_053ma1_sa@sim.local",
      "profile": "lms-sim-053ma1-sa",
      "password": "simpass"
    },
    {
      "handle": "aa",
      "role": "assistant_admin",
      "id": "a7c768e9-e905-4f28-8b4d-71e8f7257cfc",
      "email": "__sim_053ma1_aa@sim.local",
      "profile": "lms-sim-053ma1-aa",
      "password": "simpass"
    },
    {
      "handle": "ca",
      "role": "company_admin",
      "id": "52cd45c4-4d95-4000-9112-8ac5b494087b",
      "email": "__sim_053ma1_ca@sim.local",
      "profile": "lms-sim-053ma1-ca",
      "password": "simpass"
    }
  ],
  "createdVoucherCodes": [],
  "branchCity": "Sim Imp Branch 053m"
}
```