-- ============================================
-- SEED DATA: Pending Payments for Testing
-- Run this after sample_data.sql
-- ============================================

-- Delete existing pending payments for clean test
DELETE FROM public.payments WHERE status = 'pending';

-- ============================================
-- PENDING PAYMENTS WITH VARIOUS STATES
-- ============================================

-- Payment 1: Has receipt and paid_at - READY TO APPROVE
INSERT INTO public.payments (id, student_id, course_id, package_id, amount, status, payment_method, paid_at, receipt_photo)
VALUES
  ('pay-1111-1111-1111-111111111111', 'ssss1111-1111-1111-1111-111111111111', 'cccc1111-1111-1111-1111-111111111111', 'aaaa2222-2222-2222-2222-222222222222', 3500.00, 'pending', 'bank_transfer', '2025-02-05T10:30:00Z', 'https://placehold.co/400x600/23d2e2/white?text=Receipt+1')
ON CONFLICT (id) DO UPDATE SET
  status = 'pending',
  payment_method = 'bank_transfer',
  paid_at = '2025-02-05T10:30:00Z',
  receipt_photo = 'https://placehold.co/400x600/23d2e2/white?text=Receipt+1';

-- Payment 2: Has receipt and paid_at - READY TO APPROVE
INSERT INTO public.payments (id, student_id, course_id, package_id, amount, status, payment_method, paid_at, receipt_photo)
VALUES
  ('pay-2222-2222-2222-222222222222', 'ssss2222-2222-2222-2222-222222222222', 'cccc2222-2222-2222-2222-222222222222', 'aaaa3333-3333-3333-3333-333333333333', 4500.00, 'pending', 'promptpay', '2025-02-08T14:15:00Z', 'https://placehold.co/400x600/615DFA/white?text=Receipt+2')
ON CONFLICT (id) DO UPDATE SET
  status = 'pending',
  payment_method = 'promptpay',
  paid_at = '2025-02-08T14:15:00Z',
  receipt_photo = 'https://placehold.co/400x600/615DFA/white?text=Receipt+2';

-- Payment 3: Has receipt but NO paid_at - NOT READY
INSERT INTO public.payments (id, student_id, course_id, package_id, amount, status, payment_method, paid_at, receipt_photo)
VALUES
  ('pay-3333-3333-3333-333333333333', 'ssss3333-3333-3333-3333-333333333333', 'cccc4444-4444-4444-4444-444444444444', 'aaaa1111-1111-1111-1111-111111111111', 2500.00, 'pending', 'cash', NULL, 'https://placehold.co/400x600/fd434f/white?text=Receipt+3')
ON CONFLICT (id) DO UPDATE SET
  status = 'pending',
  payment_method = 'cash',
  paid_at = NULL,
  receipt_photo = 'https://placehold.co/400x600/fd434f/white?text=Receipt+3';

-- Payment 4: Has paid_at but NO receipt - NOT READY
INSERT INTO public.payments (id, student_id, course_id, package_id, amount, status, payment_method, paid_at, receipt_photo)
VALUES
  ('pay-4444-4444-4444-444444444444', 'ssss4444-4444-4444-4444-444444444444', 'cccc5555-5555-5555-5555-555555555555', 'aaaa2222-2222-2222-2222-222222222222', 3500.00, 'pending', 'credit_card', '2025-02-10T09:00:00Z', NULL)
ON CONFLICT (id) DO UPDATE SET
  status = 'pending',
  payment_method = 'credit_card',
  paid_at = '2025-02-10T09:00:00Z',
  receipt_photo = NULL;

-- Payment 5: Has NEITHER receipt NOR paid_at - NOT READY
INSERT INTO public.payments (id, student_id, course_id, package_id, amount, status, payment_method, paid_at, receipt_photo)
VALUES
  ('pay-5555-5555-5555-555555555555', 'ssss5555-5555-5555-5555-555555555555', 'cccc6666-6666-6666-6666-666666666666', 'aaaa4444-4444-4444-4444-444444444444', 25000.00, 'pending', NULL, NULL, NULL)
ON CONFLICT (id) DO UPDATE SET
  status = 'pending',
  payment_method = NULL,
  paid_at = NULL,
  receipt_photo = NULL;

-- Payment 6: Another ready to approve
INSERT INTO public.payments (id, student_id, course_id, package_id, amount, status, payment_method, paid_at, receipt_photo)
VALUES
  ('pay-6666-6666-6666-666666666666', 'ssss1111-1111-1111-1111-111111111111', 'cccc3333-3333-3333-3333-333333333333', 'aaaa5555-5555-5555-5555-555555555555', 45000.00, 'pending', 'bank_transfer', '2025-02-09T16:45:00Z', 'https://placehold.co/400x600/22c55e/white?text=Receipt+6')
ON CONFLICT (id) DO UPDATE SET
  status = 'pending',
  payment_method = 'bank_transfer',
  paid_at = '2025-02-09T16:45:00Z',
  receipt_photo = 'https://placehold.co/400x600/22c55e/white?text=Receipt+6';
