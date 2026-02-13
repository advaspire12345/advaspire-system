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
