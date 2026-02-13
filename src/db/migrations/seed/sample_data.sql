-- ============================================
-- SEED DATA: Sample data for development/testing
-- Run this after all migrations are complete
-- ============================================

-- ============================================
-- BRANCHES
-- ============================================
INSERT INTO public.branches (id, name, address, phone, email)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'Main Campus', '123 Education Street, Bangkok 10110', '02-123-4567', 'main@advaspire.com'),
  ('22222222-2222-2222-2222-222222222222', 'Sathorn Branch', '456 Sathorn Road, Bangkok 10120', '02-234-5678', 'sathorn@advaspire.com'),
  ('33333333-3333-3333-3333-333333333333', 'Sukhumvit Branch', '789 Sukhumvit Road, Bangkok 10110', '02-345-6789', 'sukhumvit@advaspire.com')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- PACKAGES
-- ============================================
INSERT INTO public.packages (id, name, description, price, sessions, duration_months)
VALUES
  ('aaaa1111-1111-1111-1111-111111111111', 'Basic Package', 'Perfect for beginners - 8 sessions per month', 2500.00, 8, 1),
  ('aaaa2222-2222-2222-2222-222222222222', 'Standard Package', 'Most popular - 12 sessions per month', 3500.00, 12, 1),
  ('aaaa3333-3333-3333-3333-333333333333', 'Premium Package', 'Intensive learning - 16 sessions per month', 4500.00, 16, 1),
  ('aaaa4444-4444-4444-4444-444444444444', 'Annual Basic', 'Basic package - annual commitment', 25000.00, 96, 12),
  ('aaaa5555-5555-5555-5555-555555555555', 'Annual Premium', 'Premium package - annual commitment', 45000.00, 192, 12)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- COURSES
-- ============================================
INSERT INTO public.courses (id, name, description, branch_id)
VALUES
  ('cccc1111-1111-1111-1111-111111111111', 'English Basics', 'Foundation English course for beginners', '11111111-1111-1111-1111-111111111111'),
  ('cccc2222-2222-2222-2222-222222222222', 'English Intermediate', 'Intermediate English skills', '11111111-1111-1111-1111-111111111111'),
  ('cccc3333-3333-3333-3333-333333333333', 'English Advanced', 'Advanced English for fluency', '11111111-1111-1111-1111-111111111111'),
  ('cccc4444-4444-4444-4444-444444444444', 'Math Fundamentals', 'Core mathematics concepts', '22222222-2222-2222-2222-222222222222'),
  ('cccc5555-5555-5555-5555-555555555555', 'Science Explorer', 'Introduction to science', '22222222-2222-2222-2222-222222222222'),
  ('cccc6666-6666-6666-6666-666666666666', 'Coding Basics', 'Introduction to programming', '33333333-3333-3333-3333-333333333333')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- ITEMS (AdCoin Shop)
-- ============================================
INSERT INTO public.items (id, name, description, price, stock, image_url)
VALUES
  ('iiii1111-1111-1111-1111-111111111111', 'Pencil Set', 'Set of 12 colored pencils', 50, 100, NULL),
  ('iiii2222-2222-2222-2222-222222222222', 'Notebook', 'Premium ruled notebook', 75, 50, NULL),
  ('iiii3333-3333-3333-3333-333333333333', 'Eraser Pack', 'Pack of 5 erasers', 25, 200, NULL),
  ('iiii4444-4444-4444-4444-444444444444', 'Ruler Set', 'Ruler and protractor set', 40, 75, NULL),
  ('iiii5555-5555-5555-5555-555555555555', 'Sticker Book', 'Fun learning stickers', 100, 30, NULL),
  ('iiii6666-6666-6666-6666-666666666666', 'Water Bottle', 'Branded water bottle', 150, 25, NULL),
  ('iiii7777-7777-7777-7777-777777777777', 'Backpack', 'School backpack', 500, 10, NULL)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- MISSIONS
-- ============================================
INSERT INTO public.missions (id, name, description, reward, start_date, end_date)
VALUES
  ('mmmm1111-1111-1111-1111-111111111111', 'Perfect Attendance', 'Attend all classes this week', 50, CURRENT_DATE, CURRENT_DATE + INTERVAL '7 days'),
  ('mmmm2222-2222-2222-2222-222222222222', 'Homework Hero', 'Complete all homework on time', 30, CURRENT_DATE, CURRENT_DATE + INTERVAL '7 days'),
  ('mmmm3333-3333-3333-3333-333333333333', 'Quiz Champion', 'Score 90%+ on any quiz', 75, CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days'),
  ('mmmm4444-4444-4444-4444-444444444444', 'Early Bird', 'Arrive 10 minutes early for 5 classes', 40, CURRENT_DATE, CURRENT_DATE + INTERVAL '14 days'),
  ('mmmm5555-5555-5555-5555-555555555555', 'Monthly Star', 'Complete all monthly goals', 200, CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- SAMPLE USERS (for testing - no auth_id yet)
-- These will need to be linked to Supabase Auth users
-- ============================================
-- Note: In production, users are created via the auth trigger
-- These are just for testing with the admin client

-- Super Admin
INSERT INTO public.users (id, email, name, role, branch_id)
VALUES
  ('uuuu0000-0000-0000-0000-000000000000', 'admin@advaspire.com', 'Super Admin', 'super_admin', NULL)
ON CONFLICT (id) DO NOTHING;

-- Branch Admins
INSERT INTO public.users (id, email, name, role, branch_id)
VALUES
  ('uuuu1111-1111-1111-1111-111111111111', 'main.admin@advaspire.com', 'Main Branch Admin', 'branch_admin', '11111111-1111-1111-1111-111111111111'),
  ('uuuu2222-2222-2222-2222-222222222222', 'sathorn.admin@advaspire.com', 'Sathorn Branch Admin', 'branch_admin', '22222222-2222-2222-2222-222222222222'),
  ('uuuu3333-3333-3333-3333-333333333333', 'sukhumvit.admin@advaspire.com', 'Sukhumvit Branch Admin', 'branch_admin', '33333333-3333-3333-3333-333333333333')
ON CONFLICT (id) DO NOTHING;

-- Instructors
INSERT INTO public.users (id, email, name, role, branch_id)
VALUES
  ('uuuu4444-4444-4444-4444-444444444444', 'teacher1@advaspire.com', 'John Teacher', 'instructor', '11111111-1111-1111-1111-111111111111'),
  ('uuuu5555-5555-5555-5555-555555555555', 'teacher2@advaspire.com', 'Jane Instructor', 'instructor', '22222222-2222-2222-2222-222222222222')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- SAMPLE STUDENTS
-- ============================================
INSERT INTO public.students (id, user_id, name, email, phone, branch_id, adcoin_balance)
VALUES
  ('ssss1111-1111-1111-1111-111111111111', NULL, 'Alice Student', 'alice@example.com', '081-111-1111', '11111111-1111-1111-1111-111111111111', 150),
  ('ssss2222-2222-2222-2222-222222222222', NULL, 'Bob Learner', 'bob@example.com', '081-222-2222', '11111111-1111-1111-1111-111111111111', 275),
  ('ssss3333-3333-3333-3333-333333333333', NULL, 'Charlie Scholar', 'charlie@example.com', '081-333-3333', '22222222-2222-2222-2222-222222222222', 420),
  ('ssss4444-4444-4444-4444-444444444444', NULL, 'Diana Bright', 'diana@example.com', '081-444-4444', '22222222-2222-2222-2222-222222222222', 85),
  ('ssss5555-5555-5555-5555-555555555555', NULL, 'Edward Quick', 'edward@example.com', '081-555-5555', '33333333-3333-3333-3333-333333333333', 310)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- SAMPLE PARENTS
-- ============================================
INSERT INTO public.parents (id, name, email, phone)
VALUES
  ('pppp1111-1111-1111-1111-111111111111', 'Alice Parent', 'alice.parent@example.com', '082-111-1111'),
  ('pppp2222-2222-2222-2222-222222222222', 'Bob Parent', 'bob.parent@example.com', '082-222-2222'),
  ('pppp3333-3333-3333-3333-333333333333', 'Charlie Parent', 'charlie.parent@example.com', '082-333-3333')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- PARENT-STUDENT RELATIONSHIPS
-- ============================================
INSERT INTO public.parent_students (parent_id, student_id)
VALUES
  ('pppp1111-1111-1111-1111-111111111111', 'ssss1111-1111-1111-1111-111111111111'),
  ('pppp2222-2222-2222-2222-222222222222', 'ssss2222-2222-2222-2222-222222222222'),
  ('pppp3333-3333-3333-3333-333333333333', 'ssss3333-3333-3333-3333-333333333333')
ON CONFLICT DO NOTHING;

-- ============================================
-- SAMPLE ENROLLMENTS
-- ============================================
INSERT INTO public.enrollments (id, student_id, course_id, package_id, status, start_date, end_date)
VALUES
  ('eeee1111-1111-1111-1111-111111111111', 'ssss1111-1111-1111-1111-111111111111', 'cccc1111-1111-1111-1111-111111111111', 'aaaa2222-2222-2222-2222-222222222222', 'active', CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE + INTERVAL '30 days'),
  ('eeee2222-2222-2222-2222-222222222222', 'ssss2222-2222-2222-2222-222222222222', 'cccc2222-2222-2222-2222-222222222222', 'aaaa3333-3333-3333-3333-333333333333', 'active', CURRENT_DATE - INTERVAL '14 days', CURRENT_DATE + INTERVAL '46 days'),
  ('eeee3333-3333-3333-3333-333333333333', 'ssss3333-3333-3333-3333-333333333333', 'cccc4444-4444-4444-4444-444444444444', 'aaaa1111-1111-1111-1111-111111111111', 'active', CURRENT_DATE - INTERVAL '7 days', CURRENT_DATE + INTERVAL '53 days'),
  ('eeee4444-4444-4444-4444-444444444444', 'ssss4444-4444-4444-4444-444444444444', 'cccc5555-5555-5555-5555-555555555555', 'aaaa2222-2222-2222-2222-222222222222', 'active', CURRENT_DATE, CURRENT_DATE + INTERVAL '60 days'),
  ('eeee5555-5555-5555-5555-555555555555', 'ssss5555-5555-5555-5555-555555555555', 'cccc6666-6666-6666-6666-666666666666', 'aaaa4444-4444-4444-4444-444444444444', 'active', CURRENT_DATE - INTERVAL '60 days', CURRENT_DATE + INTERVAL '305 days')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- SAMPLE ATTENDANCE
-- ============================================
INSERT INTO public.attendance (id, enrollment_id, date, status)
VALUES
  -- Alice's attendance
  (gen_random_uuid(), 'eeee1111-1111-1111-1111-111111111111', CURRENT_DATE - INTERVAL '7 days', 'present'),
  (gen_random_uuid(), 'eeee1111-1111-1111-1111-111111111111', CURRENT_DATE - INTERVAL '5 days', 'present'),
  (gen_random_uuid(), 'eeee1111-1111-1111-1111-111111111111', CURRENT_DATE - INTERVAL '3 days', 'present'),
  (gen_random_uuid(), 'eeee1111-1111-1111-1111-111111111111', CURRENT_DATE - INTERVAL '1 day', 'late'),
  -- Bob's attendance
  (gen_random_uuid(), 'eeee2222-2222-2222-2222-222222222222', CURRENT_DATE - INTERVAL '6 days', 'present'),
  (gen_random_uuid(), 'eeee2222-2222-2222-2222-222222222222', CURRENT_DATE - INTERVAL '4 days', 'absent'),
  (gen_random_uuid(), 'eeee2222-2222-2222-2222-222222222222', CURRENT_DATE - INTERVAL '2 days', 'present'),
  -- Charlie's attendance
  (gen_random_uuid(), 'eeee3333-3333-3333-3333-333333333333', CURRENT_DATE - INTERVAL '5 days', 'present'),
  (gen_random_uuid(), 'eeee3333-3333-3333-3333-333333333333', CURRENT_DATE - INTERVAL '3 days', 'present'),
  (gen_random_uuid(), 'eeee3333-3333-3333-3333-333333333333', CURRENT_DATE - INTERVAL '1 day', 'present')
ON CONFLICT DO NOTHING;

-- ============================================
-- SAMPLE PAYMENTS
-- ============================================
INSERT INTO public.payments (id, student_id, amount, status, payment_method, description)
VALUES
  (gen_random_uuid(), 'ssss1111-1111-1111-1111-111111111111', 3500.00, 'paid', 'credit_card', 'Standard Package - January'),
  (gen_random_uuid(), 'ssss2222-2222-2222-2222-222222222222', 4500.00, 'paid', 'bank_transfer', 'Premium Package - January'),
  (gen_random_uuid(), 'ssss3333-3333-3333-3333-333333333333', 2500.00, 'paid', 'cash', 'Basic Package - January'),
  (gen_random_uuid(), 'ssss4444-4444-4444-4444-444444444444', 3500.00, 'pending', 'credit_card', 'Standard Package - January'),
  (gen_random_uuid(), 'ssss5555-5555-5555-5555-555555555555', 25000.00, 'paid', 'bank_transfer', 'Annual Basic Package')
ON CONFLICT DO NOTHING;

-- ============================================
-- SAMPLE ADCOIN TRANSACTIONS
-- ============================================
INSERT INTO public.adcoin_transactions (id, student_id, type, amount, description)
VALUES
  (gen_random_uuid(), 'ssss1111-1111-1111-1111-111111111111', 'earned', 50, 'Perfect attendance this week'),
  (gen_random_uuid(), 'ssss1111-1111-1111-1111-111111111111', 'earned', 75, 'Quiz champion'),
  (gen_random_uuid(), 'ssss1111-1111-1111-1111-111111111111', 'spent', 25, 'Purchased eraser pack'),
  (gen_random_uuid(), 'ssss2222-2222-2222-2222-222222222222', 'earned', 100, 'Homework hero'),
  (gen_random_uuid(), 'ssss2222-2222-2222-2222-222222222222', 'earned', 200, 'Monthly star'),
  (gen_random_uuid(), 'ssss3333-3333-3333-3333-333333333333', 'earned', 150, 'Early bird bonus'),
  (gen_random_uuid(), 'ssss3333-3333-3333-3333-333333333333', 'earned', 300, 'Perfect test score'),
  (gen_random_uuid(), 'ssss3333-3333-3333-3333-333333333333', 'spent', 100, 'Purchased sticker book'),
  (gen_random_uuid(), 'ssss4444-4444-4444-4444-444444444444', 'earned', 85, 'Good participation'),
  (gen_random_uuid(), 'ssss5555-5555-5555-5555-555555555555', 'earned', 310, 'Coding challenge winner')
ON CONFLICT DO NOTHING;
