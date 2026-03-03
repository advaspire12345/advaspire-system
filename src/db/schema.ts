// ============================================
// LMS Database Schema Types
// Updated to match actual database structure
// ============================================

// ============================================
// ENUMS
// ============================================
export type UserRole =
  | 'super_admin'
  | 'admin'
  | 'branch_admin'
  | 'instructor'
  | 'student'
  | 'parent';

export type TeamMemberStatus = 'active' | 'inactive';

export type EnrollmentStatus = 'active' | 'completed' | 'cancelled' | 'expired' | 'pending';

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded' | 'cancelled';

export type PaymentType = 'registration' | 'monthly' | 'package' | 'other';

export type PaymentMethod = 'cash' | 'credit_card' | 'bank_transfer' | 'promptpay' | 'other';

export type AdcoinTransactionType = 'earned' | 'spent' | 'transfer' | 'adjusted' | 'refunded' | 'mission_reward' | 'teacher_award' | 'item_purchase';

export type AuditAction = 'INSERT' | 'UPDATE' | 'DELETE';

export type TrialSource = 'walk_in' | 'phone' | 'online' | 'referral' | 'social_media' | 'other';

export type TrialStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';

// ============================================
// BASE TYPES (matching actual database columns)
// ============================================

/**
 * User - System user linked to Supabase Auth
 */
export interface User {
  id: string;
  auth_id: string | null;
  email: string;
  name: string;
  role: UserRole;
  branch_id: string | null;
  photo: string | null;
  phone: string | null;
  address: string | null;
  cv_url: string | null;
  employed_date: string | null;
  status: TeamMemberStatus;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

/**
 * Branch - Physical location/center
 */
export interface Branch {
  id: string;
  name: string;
  company_name: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  bank_name: string | null;
  bank_account: string | null;
  admin_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export type Gender = 'male' | 'female' | 'other';

/**
 * Student - Enrolled learner
 */
export interface Student {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  photo: string | null;
  date_of_birth: string | null;
  gender: Gender | null;
  school_name: string | null;
  cover_photo: string | null;
  branch_id: string;
  level: number;
  adcoin_balance: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

/**
 * Parent - Guardian with access to children's data
 */
export interface Parent {
  id: string;
  auth_id: string | null;
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  postcode: string | null;
  city: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

/**
 * ParentStudent - Junction table for parent-student relationships
 */
export interface ParentStudent {
  id: string;
  parent_id: string;
  student_id: string;
  created_at: string;
}

/**
 * Course - Class/program offered at a branch
 */
export interface Course {
  id: string;
  name: string;
  description: string | null;
  branch_id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

/**
 * Package - Pricing tier/subscription plan
 */
export interface Package {
  id: string;
  name: string;
  description: string | null;
  price: number;
  sessions: number;
  duration_months: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

/**
 * Enrollment - Student enrolled in a course with a package
 * Actual schema from database
 */
export interface Enrollment {
  id: string;
  student_id: string;
  course_id: string;
  package_id: string | null;
  day_of_week: string | null;
  start_time: string | null;
  end_time: string | null;
  enrolled_at: string;
  status: EnrollmentStatus;
  sessions_remaining: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

/**
 * Attendance - Record of student attendance
 */
export interface Attendance {
  id: string;
  enrollment_id: string;
  date: string;
  status: AttendanceStatus;
  instructor_name: string | null;
  last_activity: string | null;
  photo: string | null;
  actual_day: string | null;
  actual_start_time: string | null;
  actual_end_time: string | null;
  class_type: 'Physical' | 'Online' | null;
  project_photos: string[] | null;
  notes: string | null;
  marked_by: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Payment - Financial transaction
 * Actual schema from database
 */
export interface Payment {
  id: string;
  student_id: string;
  course_id: string | null;
  package_id: string | null;
  amount: number;
  payment_type: PaymentType | null;
  status: PaymentStatus;
  payment_method: PaymentMethod | null;
  invoice_number: string | null;
  due_date: string | null;
  paid_at: string | null;
  is_shared_package: boolean;
  shared_with: string[] | null;
  receipt_photo: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * AdcoinTransaction - Virtual currency transaction
 * Uses sender_id and receiver_id instead of student_id
 */
export interface AdcoinTransaction {
  id: string;
  sender_id: string | null;
  receiver_id: string | null;
  amount: number;
  type: AdcoinTransactionType;
  description: string | null;
  verified_by: string | null;
  created_at: string;
}

/**
 * Item - Purchasable item in AdCoin shop
 */
export interface Item {
  id: string;
  name: string;
  description: string | null;
  adcoin_price: number;
  stock: number;
  image_url: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

/**
 * Mission - Challenge/task that awards AdCoins
 */
export interface Mission {
  id: string;
  name: string;
  description: string | null;
  adcoin_reward: number;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

/**
 * Achievement - Unlockable badge/reward
 */
export interface Achievement {
  id: string;
  name: string;
  description: string | null;
  icon_url: string | null;
  adcoin_reward: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

/**
 * StudentAchievement - Junction table for student-achievement relationships
 */
export interface StudentAchievement {
  id: string;
  student_id: string;
  achievement_id: string;
  earned_at: string;
}

/**
 * AuditLog - Record of data changes
 */
export interface AuditLog {
  id: string;
  table_name: string;
  record_id: string;
  action: AuditAction;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  changed_fields: string[] | null;
  changed_by: string | null;
  changed_by_user_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  changed_at: string;
}

/**
 * Trial - Trial class booking for prospective students
 */
export interface Trial {
  id: string;
  parent_name: string;
  parent_phone: string;
  parent_email: string | null;
  child_name: string;
  child_age: number;
  branch_id: string;
  course_id: string | null;
  source: TrialSource;
  scheduled_date: string;
  scheduled_time: string;
  message: string | null;
  status: TrialStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

// ============================================
// JOINED/EXPANDED TYPES (for queries with relations)
// ============================================

export interface UserWithBranch extends User {
  branch: Branch | null;
}

export interface StudentWithBranch extends Student {
  branch: Branch;
}

export interface StudentWithParents extends Student {
  parents: Parent[];
}

export interface StudentWithEnrollments extends Student {
  enrollments: Enrollment[];
}

export interface StudentFull extends Student {
  branch: Branch;
  enrollments: EnrollmentWithCourse[];
  parents: Parent[];
}

export interface ParentWithStudents extends Parent {
  students: Student[];
}

export interface EnrollmentWithStudent extends Enrollment {
  student: Student;
}

export interface EnrollmentWithCourse extends Enrollment {
  course: Course;
}

export interface EnrollmentWithPackage extends Enrollment {
  package: Package | null;
}

export interface EnrollmentFull extends Enrollment {
  student: StudentWithBranch;
  course: Course;
  package: Package | null;
}

export interface AttendanceWithEnrollment extends Attendance {
  enrollment: EnrollmentWithStudent;
}

export interface AttendanceFull extends Attendance {
  enrollment: EnrollmentFull;
}

export interface PaymentWithStudent extends Payment {
  student: StudentWithBranch;
}

export interface AdcoinTransactionWithStudents extends AdcoinTransaction {
  sender: Student | null;
  receiver: Student | null;
}

export interface CourseWithBranch extends Course {
  branch: Branch;
}

// ============================================
// INSERT TYPES (for creating new records)
// ============================================

export interface UserInsert {
  email: string;
  name: string;
  role?: UserRole;
  branch_id?: string | null;
  photo?: string | null;
  auth_id?: string | null;
  phone?: string | null;
  address?: string | null;
  cv_url?: string | null;
  employed_date?: string | null;
  status?: TeamMemberStatus;
}

export interface BranchInsert {
  name: string;
  company_name?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  bank_name?: string | null;
  bank_account?: string | null;
  admin_id?: string | null;
}

export interface StudentInsert {
  name: string;
  email?: string | null;
  phone?: string | null;
  photo?: string | null;
  date_of_birth?: string | null;
  gender?: Gender | null;
  school_name?: string | null;
  cover_photo?: string | null;
  branch_id: string;
  level?: number;
  adcoin_balance?: number;
}

export interface ParentInsert {
  name: string;
  email: string;
  phone?: string | null;
  address?: string | null;
  postcode?: string | null;
  city?: string | null;
  auth_id?: string | null;
}

export interface ParentStudentInsert {
  parent_id: string;
  student_id: string;
}

export interface CourseInsert {
  name: string;
  description?: string | null;
  branch_id: string;
}

export interface PackageInsert {
  name: string;
  description?: string | null;
  price: number;
  sessions: number;
  duration_months: number;
}

export interface EnrollmentInsert {
  student_id: string;
  course_id: string;
  package_id?: string | null;
  day_of_week?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  status?: EnrollmentStatus;
  sessions_remaining?: number;
}

export interface AttendanceInsert {
  enrollment_id: string;
  date: string;
  status: AttendanceStatus;
  instructor_name?: string | null;
  last_activity?: string | null;
  photo?: string | null;
  actual_day?: string | null;
  actual_start_time?: string | null;
  actual_end_time?: string | null;
  class_type?: 'Physical' | 'Online' | null;
  project_photos?: string[] | null;
  notes?: string | null;
  marked_by?: string | null;
}

export interface PaymentInsert {
  student_id: string;
  course_id?: string | null;
  package_id?: string | null;
  amount: number;
  payment_type?: PaymentType | null;
  status?: PaymentStatus;
  payment_method?: PaymentMethod | null;
  invoice_number?: string | null;
  due_date?: string | null;
  is_shared_package?: boolean;
  shared_with?: string[] | null;
  notes?: string | null;
}

export interface AdcoinTransactionInsert {
  sender_id?: string | null;
  receiver_id?: string | null;
  amount: number;
  type: AdcoinTransactionType;
  description?: string | null;
  verified_by?: string | null;
}

export interface ItemInsert {
  name: string;
  description?: string | null;
  adcoin_price: number;
  stock?: number;
  image_url?: string | null;
}

export interface MissionInsert {
  name: string;
  description?: string | null;
  adcoin_reward: number;
  start_date?: string | null;
  end_date?: string | null;
}

export interface AchievementInsert {
  name: string;
  description?: string | null;
  icon_url?: string | null;
  adcoin_reward?: number;
}

export interface StudentAchievementInsert {
  student_id: string;
  achievement_id: string;
}

export interface TrialInsert {
  parent_name: string;
  parent_phone: string;
  parent_email?: string | null;
  child_name: string;
  child_age: number;
  branch_id: string;
  course_id?: string | null;
  source?: TrialSource;
  scheduled_date: string;
  scheduled_time: string;
  message?: string | null;
  status?: TrialStatus;
  created_by?: string | null;
}

// ============================================
// UPDATE TYPES (for updating existing records)
// ============================================

export interface UserUpdate {
  email?: string;
  name?: string;
  role?: UserRole;
  branch_id?: string | null;
  photo?: string | null;
  phone?: string | null;
  address?: string | null;
  cv_url?: string | null;
  employed_date?: string | null;
  status?: TeamMemberStatus;
}

export interface BranchUpdate {
  name?: string;
  company_name?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  bank_name?: string | null;
  bank_account?: string | null;
  admin_id?: string | null;
}

export interface StudentUpdate {
  name?: string;
  email?: string | null;
  phone?: string | null;
  photo?: string | null;
  date_of_birth?: string | null;
  gender?: Gender | null;
  school_name?: string | null;
  cover_photo?: string | null;
  branch_id?: string;
  level?: number;
  adcoin_balance?: number;
}

export interface ParentUpdate {
  name?: string;
  email?: string;
  phone?: string | null;
  address?: string | null;
  postcode?: string | null;
  city?: string | null;
}

export interface CourseUpdate {
  name?: string;
  description?: string | null;
  branch_id?: string;
}

export interface PackageUpdate {
  name?: string;
  description?: string | null;
  price?: number;
  sessions?: number;
  duration_months?: number;
}

export interface EnrollmentUpdate {
  status?: EnrollmentStatus;
  day_of_week?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  sessions_remaining?: number;
}

export interface AttendanceUpdate {
  status?: AttendanceStatus;
  instructor_name?: string | null;
  last_activity?: string | null;
  photo?: string | null;
  actual_day?: string | null;
  actual_start_time?: string | null;
  actual_end_time?: string | null;
  class_type?: 'Physical' | 'Online' | null;
  project_photos?: string[] | null;
  notes?: string | null;
  marked_by?: string | null;
}

export interface PaymentUpdate {
  status?: PaymentStatus;
  course_id?: string | null;
  package_id?: string | null;
  amount?: number;
  payment_method?: PaymentMethod | null;
  paid_at?: string | null;
  receipt_photo?: string | null;
  notes?: string | null;
}

export interface ItemUpdate {
  name?: string;
  description?: string | null;
  adcoin_price?: number;
  stock?: number;
  image_url?: string | null;
}

export interface MissionUpdate {
  name?: string;
  description?: string | null;
  adcoin_reward?: number;
  start_date?: string | null;
  end_date?: string | null;
}

export interface AchievementUpdate {
  name?: string;
  description?: string | null;
  icon_url?: string | null;
  adcoin_reward?: number;
}

export interface TrialUpdate {
  parent_name?: string;
  parent_phone?: string;
  parent_email?: string | null;
  child_name?: string;
  child_age?: number;
  branch_id?: string;
  course_id?: string | null;
  source?: TrialSource;
  scheduled_date?: string;
  scheduled_time?: string;
  message?: string | null;
  status?: TrialStatus;
}

// ============================================
// SUPABASE DATABASE TYPE (for client typing)
// ============================================

export interface Database {
  public: {
    Tables: {
      users: {
        Row: User;
        Insert: UserInsert;
        Update: UserUpdate;
      };
      branches: {
        Row: Branch;
        Insert: BranchInsert;
        Update: BranchUpdate;
      };
      students: {
        Row: Student;
        Insert: StudentInsert;
        Update: StudentUpdate;
      };
      parents: {
        Row: Parent;
        Insert: ParentInsert;
        Update: ParentUpdate;
      };
      parent_students: {
        Row: ParentStudent;
        Insert: ParentStudentInsert;
        Update: never;
      };
      courses: {
        Row: Course;
        Insert: CourseInsert;
        Update: CourseUpdate;
      };
      packages: {
        Row: Package;
        Insert: PackageInsert;
        Update: PackageUpdate;
      };
      enrollments: {
        Row: Enrollment;
        Insert: EnrollmentInsert;
        Update: EnrollmentUpdate;
      };
      attendance: {
        Row: Attendance;
        Insert: AttendanceInsert;
        Update: AttendanceUpdate;
      };
      payments: {
        Row: Payment;
        Insert: PaymentInsert;
        Update: PaymentUpdate;
      };
      adcoin_transactions: {
        Row: AdcoinTransaction;
        Insert: AdcoinTransactionInsert;
        Update: never;
      };
      items: {
        Row: Item;
        Insert: ItemInsert;
        Update: ItemUpdate;
      };
      missions: {
        Row: Mission;
        Insert: MissionInsert;
        Update: MissionUpdate;
      };
      achievements: {
        Row: Achievement;
        Insert: AchievementInsert;
        Update: AchievementUpdate;
      };
      student_achievements: {
        Row: StudentAchievement;
        Insert: StudentAchievementInsert;
        Update: never;
      };
      audit_log: {
        Row: AuditLog;
        Insert: never;
        Update: never;
      };
      trials: {
        Row: Trial;
        Insert: TrialInsert;
        Update: TrialUpdate;
      };
    };
    Functions: {
      get_current_user_id: {
        Args: Record<string, never>;
        Returns: string | null;
      };
      get_current_user_branch_id: {
        Args: Record<string, never>;
        Returns: string | null;
      };
      get_current_user_role: {
        Args: Record<string, never>;
        Returns: UserRole | null;
      };
      is_super_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      is_branch_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      is_instructor: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      can_access_branch: {
        Args: { p_branch_id: string };
        Returns: boolean;
      };
      can_parent_view_student: {
        Args: { p_student_id: string };
        Returns: boolean;
      };
      can_view_student: {
        Args: { p_student_id: string };
        Returns: boolean;
      };
      has_role_level: {
        Args: { p_min_role: UserRole };
        Returns: boolean;
      };
      soft_delete: {
        Args: { p_table_name: string; p_record_id: string };
        Returns: boolean;
      };
      restore_deleted: {
        Args: { p_table_name: string; p_record_id: string };
        Returns: boolean;
      };
      get_audit_history: {
        Args: { p_table_name: string; p_record_id: string; p_limit?: number };
        Returns: AuditLog[];
      };
    };
  };
}

// ============================================
// UTILITY TYPES
// ============================================

export type TableRow<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];

export type TableInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];

export type TableUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];

// ============================================
// LEGACY LMS TYPES (for backward compatibility)
// ============================================

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: 'student' | 'instructor' | 'admin';
  created_at: string;
  updated_at: string;
}

export interface Lesson {
  id: string;
  course_id: string;
  title: string;
  slug: string;
  content: string | null;
  video_url: string | null;
  duration_minutes: number | null;
  position: number;
  is_preview: boolean;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface LessonProgress {
  id: string;
  user_id: string;
  lesson_id: string;
  completed: boolean;
  completed_at: string | null;
  watched_seconds: number;
  created_at: string;
  updated_at: string;
}

export interface CourseWithInstructor {
  id: string;
  instructor_id: string;
  title: string;
  slug: string;
  description: string | null;
  thumbnail_url: string | null;
  price: number;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  instructor: Profile;
}

export interface CourseWithLessons {
  id: string;
  instructor_id: string;
  title: string;
  slug: string;
  description: string | null;
  thumbnail_url: string | null;
  price: number;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  lessons: Lesson[];
}

export interface CourseWithInstructorAndLessons {
  id: string;
  instructor_id: string;
  title: string;
  slug: string;
  description: string | null;
  thumbnail_url: string | null;
  price: number;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  instructor: Profile;
  lessons: Lesson[];
}

export interface EnrollmentWithCourseProfile {
  id: string;
  user_id: string;
  course_id: string;
  enrolled_at: string;
  completed_at: string | null;
  progress: number;
  course: {
    id: string;
    title: string;
    slug: string;
    description: string | null;
    thumbnail_url: string | null;
  };
}

export interface LessonWithProgress extends Lesson {
  lesson_progress: LessonProgress[];
}

export interface ProfileInsert {
  id: string;
  email: string;
  full_name?: string | null;
  avatar_url?: string | null;
  role?: 'student' | 'instructor' | 'admin';
}

export interface LessonInsert {
  course_id: string;
  title: string;
  slug: string;
  content?: string | null;
  video_url?: string | null;
  duration_minutes?: number | null;
  position?: number;
  is_preview?: boolean;
  is_published?: boolean;
}

export interface LessonProgressInsert {
  user_id: string;
  lesson_id: string;
  completed?: boolean;
  watched_seconds?: number;
}

export interface LmsEnrollmentInsert {
  user_id: string;
  course_id: string;
}

export interface ProfileUpdate {
  full_name?: string | null;
  avatar_url?: string | null;
  role?: 'student' | 'instructor' | 'admin';
}

export interface LessonUpdate {
  title?: string;
  slug?: string;
  content?: string | null;
  video_url?: string | null;
  duration_minutes?: number | null;
  position?: number;
  is_preview?: boolean;
  is_published?: boolean;
}

export interface LessonProgressUpdate {
  completed?: boolean;
  completed_at?: string | null;
  watched_seconds?: number;
}

// ============================================
// PROGRAM/COURSE EXTENDED TYPES
// ============================================

export type ProgramType = 'course' | 'workshop' | 'bootcamp' | 'certification';
export type CourseStatus = 'draft' | 'active' | 'archived';
export type LessonContentType = 'video' | 'text' | 'quiz' | 'assignment';
export type PricingPackageType = 'monthly' | 'session';

/**
 * Course Category
 */
export interface CourseCategory {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  deleted_at: string | null;
}

/**
 * Extended Course (Program) - includes new fields
 */
export interface CourseExtended extends Course {
  short_description: string | null;
  category_id: string | null;
  number_of_levels: number | null;
  sessions_to_level_up: number | null;
  program_type: ProgramType | null;
  status: CourseStatus | null;
  youtube_url: string | null;
  cover_image_url: string | null;
  assessment_enabled: boolean;
  levelling_time_minutes: number | null;
}

/**
 * Course Language junction
 */
export interface CourseLanguage {
  id: string;
  course_id: string;
  language: string;
}

/**
 * Course Instructor junction
 */
export interface CourseInstructor {
  id: string;
  course_id: string;
  user_id: string;
}

/**
 * Course Branch junction
 */
export interface CourseBranch {
  id: string;
  course_id: string;
  branch_id: string;
}

/**
 * Course Requirement
 */
export interface CourseRequirement {
  id: string;
  course_id: string;
  requirement: string;
  sort_order: number;
}

/**
 * Course Outcome
 */
export interface CourseOutcome {
  id: string;
  course_id: string;
  outcome: string;
  sort_order: number;
}

/**
 * Course FAQ
 */
export interface CourseFaq {
  id: string;
  course_id: string;
  question: string;
  answer: string;
  sort_order: number;
}

/**
 * Course Section (Curriculum)
 */
export interface CourseSection {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  sort_order: number;
}

/**
 * Course Lesson (within Section)
 */
export interface CourseLesson {
  id: string;
  section_id: string;
  title: string;
  description: string | null;
  duration_minutes: number | null;
  content_type: LessonContentType | null;
  sort_order: number;
}

/**
 * Course Pricing
 */
export interface CoursePricing {
  id: string;
  course_id: string;
  package_type: PricingPackageType;
  price: number;
  duration: number;
  description: string | null;
  is_default: boolean;
  deleted_at: string | null;
}

// ============================================
// PROGRAM INSERT TYPES
// ============================================

export interface CourseCategoryInsert {
  name: string;
  description?: string | null;
}

export interface CourseExtendedInsert extends CourseInsert {
  short_description?: string | null;
  category_id?: string | null;
  number_of_levels?: number | null;
  sessions_to_level_up?: number | null;
  program_type?: ProgramType | null;
  status?: CourseStatus;
  youtube_url?: string | null;
  cover_image_url?: string | null;
  assessment_enabled?: boolean;
  levelling_time_minutes?: number | null;
}

export interface CourseLanguageInsert {
  course_id: string;
  language: string;
}

export interface CourseInstructorInsert {
  course_id: string;
  user_id: string;
}

export interface CourseBranchInsert {
  course_id: string;
  branch_id: string;
}

export interface CourseRequirementInsert {
  course_id: string;
  requirement: string;
  sort_order?: number;
}

export interface CourseOutcomeInsert {
  course_id: string;
  outcome: string;
  sort_order?: number;
}

export interface CourseFaqInsert {
  course_id: string;
  question: string;
  answer: string;
  sort_order?: number;
}

export interface CourseSectionInsert {
  course_id: string;
  title: string;
  description?: string | null;
  sort_order?: number;
}

export interface CourseLessonInsert {
  section_id: string;
  title: string;
  description?: string | null;
  duration_minutes?: number | null;
  content_type?: LessonContentType | null;
  sort_order?: number;
}

export interface CoursePricingInsert {
  course_id: string;
  package_type: PricingPackageType;
  price: number;
  duration: number;
  description?: string | null;
  is_default?: boolean;
}

// ============================================
// PROGRAM UPDATE TYPES
// ============================================

export interface CourseCategoryUpdate {
  name?: string;
  description?: string | null;
}

export interface CourseExtendedUpdate extends CourseUpdate {
  short_description?: string | null;
  category_id?: string | null;
  number_of_levels?: number | null;
  sessions_to_level_up?: number | null;
  program_type?: ProgramType | null;
  status?: CourseStatus;
  youtube_url?: string | null;
  cover_image_url?: string | null;
  assessment_enabled?: boolean;
  levelling_time_minutes?: number | null;
}

export interface CourseRequirementUpdate {
  requirement?: string;
  sort_order?: number;
}

export interface CourseOutcomeUpdate {
  outcome?: string;
  sort_order?: number;
}

export interface CourseFaqUpdate {
  question?: string;
  answer?: string;
  sort_order?: number;
}

export interface CourseSectionUpdate {
  title?: string;
  description?: string | null;
  sort_order?: number;
}

export interface CourseLessonUpdate {
  title?: string;
  description?: string | null;
  duration_minutes?: number | null;
  content_type?: LessonContentType | null;
  sort_order?: number;
}

export interface CoursePricingUpdate {
  package_type?: PricingPackageType;
  price?: number;
  duration?: number;
  description?: string | null;
  is_default?: boolean;
}

// ============================================
// PROGRAM JOINED/EXPANDED TYPES
// ============================================

export interface CourseSectionWithLessons extends CourseSection {
  lessons: CourseLesson[];
}

export interface ProgramTableRow {
  id: string;
  name: string;
  short_description: string | null;
  category_id: string | null;
  category_name: string | null;
  number_of_levels: number | null;
  sessions_to_level_up: number | null;
  program_type: ProgramType | null;
  status: CourseStatus | null;
  cover_image_url: string | null;
  assessment_enabled: boolean;
  levelling_time_minutes: number | null;
  enrolled_count: number;
  lesson_count: number;
  branch_names: string[];
  default_pricing: CoursePricing | null;
}

export interface ProgramFull extends CourseExtended {
  category: CourseCategory | null;
  languages: string[];
  instructors: User[];
  branches: Branch[];
  requirements: CourseRequirement[];
  outcomes: CourseOutcome[];
  faqs: CourseFaq[];
  sections: CourseSectionWithLessons[];
  pricing: CoursePricing[];
}
