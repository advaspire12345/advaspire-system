# Manual Testing Checklist — All Roles

## Test Accounts Needed

| Role | Email | Password | Notes |
|------|-------|----------|-------|
| Super Admin | admin@advaspire.com | (existing) | Hardcoded in SUPERADMIN_EMAILS |
| Group Admin | (existing) | (existing) | role: group_admin / admin |
| Company Admin | (existing) | (existing) | role: company_admin / branch_admin |
| Assistant Admin | **CREATE** | Test@123 | role: assistant_admin |
| Instructor | (existing) | (existing) | role: instructor |
| Parent | **CREATE** | Parent@123 | Must have children linked |
| Student | **CREATE** | Student@123 | Must have student portal login |

---

## 1. Super Admin Testing

### Dashboard
- [ ] Can view dashboard with all stats
- [ ] Sees all branches data (no branch filter)

### Branches
- [ ] Can view all companies and branches
- [ ] Can add Company, HQ, Branch
- [ ] Code field: editable for Company, auto-generated for HQ/Branch
- [ ] Can edit any branch
- [ ] Can delete any branch
- [ ] Registration form icon shows for HQ/Branch (not Company)
- [ ] Click registration icon → modal opens with form
- [ ] Copy link works

### Students
- [ ] Can view ALL students across all branches
- [ ] Can add student
- [ ] Student ID generates correctly: ADV-{branchCode}-{YY}{seq}
- [ ] Can edit student
- [ ] Can delete student
- [ ] Parent dropdown shows parents from all branches

### Programs
- [ ] Can view all programs
- [ ] Can add program (all tabs: Basic, Info, Curriculum, Pricing, Media)
- [ ] Pricing tab: Voucher dropdown shows created vouchers + "Create Voucher" option
- [ ] Can edit program
- [ ] Can delete program

### Slot
- [ ] Can view all slots
- [ ] Grouped by program + branch
- [ ] Same day slots shown on same line
- [ ] Can add slot (modal with program + branch + day/time/duration/limit)
- [ ] Can edit slot
- [ ] Can delete slot

### Voucher
- [ ] Can view all vouchers
- [ ] Can add voucher (code auto-generated, can edit, uppercase)
- [ ] Discount type: Percentage / Fixed
- [ ] Expiry type: Monthly / Specific Date
- [ ] Can edit voucher
- [ ] Can delete voucher

### Team
- [ ] Can view all team members
- [ ] Can add team member (all roles available)
- [ ] Edit Permissions button visible
- [ ] Role permission modal: all tabs visible
- [ ] Can edit team member
- [ ] Can delete team member

### Attendance
- [ ] Can mark attendance
- [ ] Can view attendance history
- [ ] Date filter works (without page refresh)

### Payments
- [ ] Payment Record: can view all
- [ ] Pending Payments: can view, add, edit, approve, delete
- [ ] Voucher dropdown in pending payment modal

### Leaderboard
- [ ] Can view all students globally (no Local/Global filter)
- [ ] Transfer Adcoin button works
- [ ] Sender pre-selects logged-in user
- [ ] Can search all participants

### Transactions
- [ ] Can view all transactions globally
- [ ] Transfer Adcoin button works
- [ ] Adcoin Adjustment button visible
- [ ] Both modals: sender pre-selects logged-in user

### Examination
- [ ] Can view all exams
- [ ] Can add exam
- [ ] Certificate preview works with template background

### Import
- [ ] Can view import page
- [ ] Can download all 4 templates
- [ ] Can upload and import each CSV type

### Profile
- [ ] Settings icon → Profile page loads
- [ ] Can edit name, phone, address, city
- [ ] Can change password (current + new + confirm)
- [ ] Photo upload works

---

## 2. Group Admin Testing

### Key Differences from Super Admin
- [ ] Sees only own company branches and data
- [ ] Branch column shows city name (not branch name)
- [ ] Companies permission: VIEW_ONLY (cannot create/edit/delete companies)
- [ ] Can see all branches under own company

### Leaderboard
- [ ] No Local/Global filter (sees all company data)
- [ ] Transfer modal shows all company participants

### Transactions  
- [ ] No branch filter (sees all company transactions)
- [ ] Adcoin Adjustment button visible

### Team
- [ ] Edit Permissions button visible
- [ ] Can edit all role tabs in permission modal
- [ ] Can create custom roles (max 2)

---

## 3. Company Admin Testing

### Key Differences
- [ ] Sees only own company branches
- [ ] Branch column hidden in most tables
- [ ] Can only create: assistant_admin, instructor roles

### Leaderboard
- [ ] Local/Global filter shows (tab style)
- [ ] Local: own branch students only, ranks from 1
- [ ] Global: all company branches
- [ ] Transfer button (top): local participants only
- [ ] Action button in Global: global participants

### Transactions
- [ ] Shows own branch transactions only
- [ ] Transfer modal: own branch participants
- [ ] Adcoin Adjustment button visible

### Team
- [ ] Edit Permissions button visible
- [ ] Can only edit Assistant + Instructor tabs
- [ ] Cannot edit Group Admin or Company Admin tabs

### Pending Payments
- [ ] Can add pending payment
- [ ] Voucher dropdown shows available vouchers

---

## 4. Assistant Admin Testing

### Key Differences
- [ ] Similar to Company Admin but NO team management
- [ ] No delete permissions on most resources
- [ ] Team page: not visible (NO_ACCESS)

### Leaderboard
- [ ] Local/Global filter shows
- [ ] Same as Company Admin

### Transactions
- [ ] Shows own branch only
- [ ] NO Adcoin Adjustment button (not super_admin/group_admin/company_admin)

---

## 5. Instructor Testing

### Key Differences
- [ ] Most restricted admin role
- [ ] Branch column hidden everywhere
- [ ] Cannot access: Companies, Branches, Team, Payment Record, Pending Payments
- [ ] Can access: Dashboard (view), Trials, Students (view only), Examinations, Programs (view), Attendance, Attendance History (view), Leaderboard (view), Transactions

### Leaderboard
- [ ] Local/Global filter shows
- [ ] Transfer limited to own branch

---

## 6. Parent Testing

### Login
- [ ] Login with parent email/password
- [ ] Redirects to /parent

### Parent Portal
- [ ] Profile header: name, email, stats (children, sessions, attended, next class)
- [ ] Settings icon → profile edit modal
- [ ] Can edit: phone, address, postcode, city, password
- [ ] Cover + avatar upload in modal
- [ ] Children section shows all linked children
- [ ] Upcoming classes correct
- [ ] Calendar shows scheduled and attended dates
- [ ] Payment list shows payment history
- [ ] Attendance list shows attendance records

---

## 7. Student Testing

### Login
- [ ] Login via Student tab (username + password)
- [ ] Redirects to /student-portal

### Student Portal
- [ ] Can view own dashboard/progress
- [ ] Can view schedule
- [ ] Can view adcoin balance

---

## 8. Public Registration Form

### Access
- [ ] Navigate to /register/{branchCode}
- [ ] Form loads with branch name and available programs
- [ ] Invalid code shows error page

### Form
- [ ] Parent fields: name, email, phone, address, postcode, city
- [ ] Student fields: name, DOB (auto age), gender, school name
- [ ] Program + time slot: can add multiple per student
- [ ] Add Another Student button works
- [ ] Submit creates student with pending enrollment
- [ ] Success page shows

### Desktop Layout
- [ ] Two-column: parent left, students right
- [ ] Mobile: single column

---

## 9. Login Features

### Remember Me
- [ ] Check "Remember Me" → close browser → reopen → still logged in
- [ ] Uncheck → close browser → reopen → logged out

### Forgot Password
- [ ] Click "Forgot password?" → shows email field
- [ ] Enter email → "Send Reset Link" → success message
- [ ] Check email for reset link
- [ ] Click link → /reset-password page
- [ ] Enter new password + confirm → updates successfully
- [ ] Can login with new password
