# Simulator report — scenario-import-pool

**Run dir:** /Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-18T14-43-42
**Steps:** 2
**Drift findings:** 4

## ❌ Drift / failure findings

| Step | Role | Field | DOM | DB | Expected | Result |
|------|------|-------|-----|-----|----------|--------|
| 2 | assistant_admin | `enrollment.pool_id_set` | — | false | null | ❌ DB_FAIL |
| 2 | assistant_admin | `/student.row_visible(OrphanShared)` | — | 0 | false | ❌ DB_FAIL |
| 2 | company_admin | `enrollment.pool_id_set` | — | false | null | ❌ DB_FAIL |
| 2 | company_admin | `/student.row_visible(OrphanShared)` | — | 0 | false | ❌ DB_FAIL |

## Full checkpoint table

| Step | Role | Field | DOM | DB | Expected | Result |
|------|------|-------|-----|-----|----------|--------|
| 1 | assistant_admin | `/student.row_visible(AbuImp)` | true | — | true | ✅ |
| 1 | assistant_admin | `pool.active_students` | — | 2 | 2 | ✅ |
| 1 | assistant_admin | `enrollment.pool_id_set` | — | true | true | ✅ |
| 1 | company_admin | `/student.row_visible(AbuImp)` | true | — | true | ✅ |
| 1 | company_admin | `pool.active_students` | — | 2 | 2 | ✅ |
| 1 | company_admin | `enrollment.pool_id_set` | — | true | true | ✅ |
| 2 | assistant_admin | `/student.row_visible(OrphanShared)` | true | — | true | ✅ |
| 2 | assistant_admin | `enrollment.pool_id_set` | — | false | null | ❌ DB_FAIL |
| 2 | assistant_admin | `/student.row_visible(OrphanShared)` | — | 0 | false | ❌ DB_FAIL |
| 2 | company_admin | `/student.row_visible(OrphanShared)` | true | — | true | ✅ |
| 2 | company_admin | `enrollment.pool_id_set` | — | false | null | ❌ DB_FAIL |
| 2 | company_admin | `/student.row_visible(OrphanShared)` | — | 0 | false | ❌ DB_FAIL |

## Per-step breakdown

### Step 1: `import_students_csv` as **sa**

```yaml
student: "AbuImp"
rows: [{"student_name":"AliImp","date_of_birth":"2015-01-01","gender":"male","school_name":"Sim School","parent_name":"Imp Parent","parent_email":"imp.parent@sim.local","parent_phone":"0123450001","package_type":"session","package_duration":"4","schedule_day":"monday","schedule_time":"10:00","enrollment_status":"active","sessions_remaining":"0","share_with_sibling":""},{"student_name":"AbuImp","date_of_birth":"2017-01-01","gender":"male","school_name":"Sim School","parent_name":"Imp Parent","parent_email":"imp.parent@sim.local","parent_phone":"0123450001","package_type":"session","package_duration":"4","schedule_day":"monday","schedule_time":"10:00","enrollment_status":"active","sessions_remaining":"0","share_with_sibling":"true"}]
branch: "Sim Imp Branch 5nas"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-18T14-43-42/screenshots/1-actor-sa.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-18T14-43-42/screenshots/1-observer-aa.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-18T14-43-42/screenshots/1-observer-ca.png`

### Step 2: `import_students_csv` as **sa**

```yaml
student: "OrphanShared"
rows: [{"student_name":"OrphanShared","date_of_birth":"2015-01-01","gender":"male","school_name":"Sim School","parent_name":"Orphan Parent","parent_email":"orphan.parent@sim.local","parent_phone":"0123450099","package_type":"session","package_duration":"4","schedule_day":"monday","schedule_time":"10:00","enrollment_status":"active","sessions_remaining":"0","share_with_sibling":"true"}]
branch: "Sim Imp Branch 5nas"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-18T14-43-42/screenshots/2-actor-sa.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-18T14-43-42/screenshots/2-observer-aa.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-18T14-43-42/screenshots/2-observer-ca.png`

## Fixtures

```json
{
  "runId": "5nasci",
  "branchId": "3b930969-14dc-4349-9b8f-9584dd152720",
  "branchName": "__sim_5nasci_Sim Imp Branch",
  "courseId": "d325ac5b-9a00-41cb-b9a7-aa00d4ee0997",
  "courseName": "__sim_5nasci_ImportCourse",
  "packageId": "f066cf4a-0454-4dd7-8fdb-f9b38a5d168f",
  "users": [
    {
      "handle": "sa",
      "role": "super_admin",
      "id": "933daa13-d54b-4bfa-a264-0eba9ea5258a",
      "email": "__sim_5nasci_sa@sim.local",
      "profile": "lms-sim-5nasci-sa",
      "password": "simpass"
    },
    {
      "handle": "aa",
      "role": "assistant_admin",
      "id": "af03d872-c862-43c7-9025-9b068a1d3968",
      "email": "__sim_5nasci_aa@sim.local",
      "profile": "lms-sim-5nasci-aa",
      "password": "simpass"
    },
    {
      "handle": "ca",
      "role": "company_admin",
      "id": "c6b8beab-05d5-4ad0-b74b-9782129a24a2",
      "email": "__sim_5nasci_ca@sim.local",
      "profile": "lms-sim-5nasci-ca",
      "password": "simpass"
    }
  ],
  "createdVoucherCodes": [],
  "branchCity": "Sim Imp Branch 5nas"
}
```