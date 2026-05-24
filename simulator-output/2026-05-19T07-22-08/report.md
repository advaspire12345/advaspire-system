# Simulator report — scenario-import-pool

**Run dir:** /Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-19T07-22-08
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
branch: "Sim Imp Branch ugij"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-19T07-22-08/screenshots/1-actor-sa.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-19T07-22-08/screenshots/1-observer-aa.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-19T07-22-08/screenshots/1-observer-ca.png`

## Fixtures

```json
{
  "runId": "ugij5v",
  "branchId": "32241929-afa2-46b8-b429-2428822a35ed",
  "branchName": "__sim_ugij5v_Sim Imp Branch",
  "courseId": "18a3b5d5-3808-44fe-a6bd-43b737d9b5e5",
  "courseName": "__sim_ugij5v_ImportCourse",
  "packageId": "7607034f-aeb3-45ef-a13d-1e76cd57ac34",
  "users": [
    {
      "handle": "sa",
      "role": "super_admin",
      "id": "d9d4f8c1-9bfe-49c0-b58a-b5d7546c197a",
      "email": "__sim_ugij5v_sa@sim.local",
      "profile": "lms-sim-ugij5v-sa",
      "password": "simpass"
    },
    {
      "handle": "aa",
      "role": "assistant_admin",
      "id": "5cdf05b1-b660-4744-a07c-a6344a6cefa7",
      "email": "__sim_ugij5v_aa@sim.local",
      "profile": "lms-sim-ugij5v-aa",
      "password": "simpass"
    },
    {
      "handle": "ca",
      "role": "company_admin",
      "id": "eab87e58-190d-429d-8f00-97aeba2f90ac",
      "email": "__sim_ugij5v_ca@sim.local",
      "profile": "lms-sim-ugij5v-ca",
      "password": "simpass"
    }
  ],
  "createdVoucherCodes": [],
  "branchCity": "Sim Imp Branch ugij"
}
```