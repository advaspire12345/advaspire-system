import { supabaseAdmin } from "@/db";
import type {
  Parent,
  ParentInsert,
  ParentUpdate,
  ParentWithStudents,
  Student,
} from "@/db/schema";

// ============================================
// READ OPERATIONS
// ============================================

export async function getParentById(parentId: string): Promise<Parent | null> {
  const { data, error } = await supabaseAdmin
    .from('parents')
    .select('*')
    .eq('id', parentId)
    .is('deleted_at', null)
    .single();

  if (error) {
    console.error('Error fetching parent:', error);
    return null;
  }

  return data;
}

export async function getParentByEmail(email: string): Promise<Parent | null> {
  const { data, error } = await supabaseAdmin
    .from('parents')
    .select('*')
    .eq('email', email)
    .is('deleted_at', null)
    .single();

  if (error) {
    console.error('Error fetching parent by email:', error);
    return null;
  }

  return data;
}

export async function getParentByAuthId(authId: string): Promise<Parent | null> {
  const { data, error } = await supabaseAdmin
    .from('parents')
    .select('*')
    .eq('auth_id', authId)
    .is('deleted_at', null)
    .single();

  if (error) {
    console.error('Error fetching parent by auth_id:', error);
    return null;
  }

  return data;
}

export async function getParentWithStudents(parentId: string): Promise<ParentWithStudents | null> {
  const { data, error } = await supabaseAdmin
    .from('parents')
    .select(`
      *,
      students:parent_students(
        student:students(*)
      )
    `)
    .eq('id', parentId)
    .is('deleted_at', null)
    .single();

  if (error) {
    console.error('Error fetching parent with students:', error);
    return null;
  }

  // Flatten students array
  const flatData = {
    ...data,
    students: data.students?.map((ps: { student: Student }) => ps.student) ?? [],
  };

  return flatData as ParentWithStudents;
}

export async function getAllParents(): Promise<Parent[]> {
  const { data, error } = await supabaseAdmin
    .from('parents')
    .select('*')
    .is('deleted_at', null)
    .order('name');

  if (error) {
    console.error('Error fetching all parents:', error);
    return [];
  }

  return data ?? [];
}

export async function getParentsByBranchIds(branchIds: string[]): Promise<Parent[]> {
  if (branchIds.length === 0) return [];

  // Step 1: Get student IDs in these branches
  const { data: students, error: studentError } = await supabaseAdmin
    .from('students')
    .select('id')
    .in('branch_id', branchIds)
    .is('deleted_at', null);

  if (studentError || !students?.length) {
    if (studentError) console.error('Error fetching students by branch:', studentError);
    return [];
  }

  const studentIds = students.map((s) => s.id);

  // Step 2: Get parent IDs linked to those students
  const { data: links, error: linkError } = await supabaseAdmin
    .from('parent_students')
    .select('parent_id')
    .in('student_id', studentIds);

  if (linkError || !links?.length) {
    if (linkError) console.error('Error fetching parent-student links:', linkError);
    return [];
  }

  const parentIds = [...new Set(links.map((l) => l.parent_id))];

  // Step 3: Fetch the parents
  const { data, error } = await supabaseAdmin
    .from('parents')
    .select('*')
    .in('id', parentIds)
    .is('deleted_at', null)
    .order('name');

  if (error) {
    console.error('Error fetching parents by branch:', error);
    return [];
  }

  return data ?? [];
}

export async function searchParents(query: string): Promise<Parent[]> {
  const { data, error } = await supabaseAdmin
    .from('parents')
    .select('*')
    .is('deleted_at', null)
    .or(`name.ilike.%${query}%,email.ilike.%${query}%`)
    .order('name')
    .limit(50);

  if (error) {
    console.error('Error searching parents:', error);
    return [];
  }

  return data ?? [];
}

// ============================================
// GET CHILDREN (STUDENTS) FOR A PARENT
// ============================================

export async function getParentChildren(parentId: string): Promise<Student[]> {
  const { data, error } = await supabaseAdmin
    .from('parent_students')
    .select(`
      students(*)
    `)
    .eq('parent_id', parentId);

  if (error) {
    console.error('Error fetching parent children:', error);
    return [];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return data?.map((ps: any) => ps.students).filter(Boolean) ?? [];
}

export async function getParentChildrenByAuthId(authId: string): Promise<Student[]> {
  const parent = await getParentByAuthId(authId);
  if (!parent) {
    return [];
  }
  return getParentChildren(parent.id);
}

// ============================================
// WRITE OPERATIONS
// ============================================

export async function createParent(parentData: ParentInsert): Promise<Parent | null> {
  const { data, error } = await supabaseAdmin
    .from('parents')
    .insert(parentData)
    .select()
    .single();

  if (error) {
    console.error('Error creating parent:', error);
    return null;
  }

  return data;
}

/**
 * Creates a parent record AND a Supabase Auth account, then links them.
 * Uses the parent's email as login with a default password.
 * Returns the created parent or null on failure.
 */
export async function createParentWithAuth(
  parentData: ParentInsert,
  defaultPassword: string = "Parent@123"
): Promise<Parent | null> {
  // 1. Create the Supabase Auth account
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: parentData.email,
    password: defaultPassword,
    email_confirm: true,
    user_metadata: {
      full_name: parentData.name,
      role: 'parent',
    },
  });

  if (authError) {
    console.error('Error creating parent auth account:', authError);
    // If auth account already exists, try to look it up
    if (authError.message?.includes('already been registered')) {
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
      const existingAuth = existingUsers?.users?.find(
        (u) => u.email === parentData.email
      );
      if (existingAuth) {
        // Create parent record linked to existing auth
        const parent = await createParent({
          ...parentData,
          auth_id: existingAuth.id,
        } as any);
        return parent;
      }
    }
    // Fall back to creating parent without auth
    return createParent(parentData);
  }

  // 2. Create the parent record with auth_id linked
  const parent = await createParent({
    ...parentData,
    auth_id: authData.user.id,
  } as any);

  // 3. Also create a users table entry for role-based access
  if (parent && authData.user) {
    await supabaseAdmin.from('users').insert({
      auth_id: authData.user.id,
      email: parentData.email,
      name: parentData.name,
      role: 'parent',
      status: 'active',
    });
  }

  return parent;
}

/**
 * Ensures an existing parent has a Supabase Auth account.
 * If no auth_id is set, creates one and links it.
 */
export async function ensureParentAuth(
  parentId: string,
  defaultPassword: string = "Parent@123"
): Promise<boolean> {
  const parent = await getParentById(parentId);
  if (!parent) return false;
  if (parent.auth_id) return true; // Already linked

  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: parent.email,
    password: defaultPassword,
    email_confirm: true,
    user_metadata: {
      full_name: parent.name,
      role: 'parent',
    },
  });

  if (authError) {
    console.error('Error creating auth for existing parent:', authError);
    // Try to find existing auth by email
    if (authError.message?.includes('already been registered')) {
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
      const existingAuth = existingUsers?.users?.find(
        (u) => u.email === parent.email
      );
      if (existingAuth) {
        await linkParentToAuth(parentId, existingAuth.id);
        return true;
      }
    }
    return false;
  }

  // Link auth to parent
  await linkParentToAuth(parentId, authData.user.id);

  // Create users table entry
  await supabaseAdmin.from('users').insert({
    auth_id: authData.user.id,
    email: parent.email,
    name: parent.name,
    role: 'parent',
    status: 'active',
  });

  return true;
}

export async function updateParent(parentId: string, parentData: ParentUpdate): Promise<Parent | null> {
  const { data, error } = await supabaseAdmin
    .from('parents')
    .update(parentData)
    .eq('id', parentId)
    .select()
    .single();

  if (error) {
    console.error('Error updating parent:', error);
    return null;
  }

  return data;
}

export async function linkParentToAuth(parentId: string, authId: string): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from('parents')
    .update({ auth_id: authId })
    .eq('id', parentId);

  if (error) {
    console.error('Error linking parent to auth:', error);
    return false;
  }

  return true;
}

export async function softDeleteParent(parentId: string): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from('parents')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', parentId);

  if (error) {
    console.error('Error soft deleting parent:', error);
    return false;
  }

  return true;
}

export async function restoreParent(parentId: string): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from('parents')
    .update({ deleted_at: null })
    .eq('id', parentId);

  if (error) {
    console.error('Error restoring parent:', error);
    return false;
  }

  return true;
}
