import { supabaseAdmin } from "@/db";
import type {
  AdcoinTransaction,
  AdcoinTransactionInsert,
  AdcoinTransactionType,
  AdcoinTransactionWithStudents,
} from "@/db/schema";
import { updateAdcoinBalance, getStudentById } from "./students";
import { getUserById } from "./users";

// ============================================
// PARTICIPANT HELPERS
// ============================================

export type ParticipantType = 'student' | 'user';

export interface ParticipantInfo {
  id: string;
  name: string;
  type: ParticipantType;
  adcoinBalance: number;
}

async function getParticipantInfo(
  id: string,
  type: ParticipantType
): Promise<ParticipantInfo | null> {
  if (type === 'student') {
    const student = await getStudentById(id);
    if (!student) return null;
    return {
      id: student.id,
      name: student.name,
      type: 'student',
      adcoinBalance: student.adcoin_balance ?? 0,
    };
  } else {
    const user = await getUserById(id);
    if (!user) return null;
    return {
      id: user.id,
      name: user.name,
      type: 'user',
      adcoinBalance: 0, // Users don't have adcoin balance
    };
  }
}

// ============================================
// READ OPERATIONS
// ============================================

export async function getTransactionById(transactionId: string): Promise<AdcoinTransaction | null> {
  const { data, error } = await supabaseAdmin
    .from('adcoin_transactions')
    .select('*')
    .eq('id', transactionId)
    .single();

  if (error) {
    console.error('Error fetching transaction:', error);
    return null;
  }

  return data;
}

export async function getTransactionWithStudents(transactionId: string): Promise<AdcoinTransactionWithStudents | null> {
  const { data, error } = await supabaseAdmin
    .from('adcoin_transactions')
    .select(`
      *,
      sender:students!adcoin_transactions_sender_id_fkey(*),
      receiver:students!adcoin_transactions_receiver_id_fkey(*)
    `)
    .eq('id', transactionId)
    .single();

  if (error) {
    console.error('Error fetching transaction with students:', error);
    return null;
  }

  return data as AdcoinTransactionWithStudents;
}

export async function getTransactionsByStudentId(studentId: string): Promise<AdcoinTransaction[]> {
  const { data, error } = await supabaseAdmin
    .from('adcoin_transactions')
    .select('*')
    .or(`sender_id.eq.${studentId},receiver_id.eq.${studentId}`)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching transactions by student:', error);
    return [];
  }

  return data ?? [];
}

export async function getTransactionsByType(
  type: AdcoinTransactionType,
  branchId?: string
): Promise<AdcoinTransaction[]> {
  let query = supabaseAdmin
    .from('adcoin_transactions')
    .select('*')
    .eq('type', type)
    .order('created_at', { ascending: false });

  // Note: To filter by branch, we'd need to join with students table
  // This is a simplified version

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching transactions by type:', error);
    return [];
  }

  return data ?? [];
}

export async function getTransactionsByDateRange(
  startDate: string,
  endDate: string
): Promise<AdcoinTransaction[]> {
  const { data, error } = await supabaseAdmin
    .from('adcoin_transactions')
    .select('*')
    .gte('created_at', startDate)
    .lte('created_at', endDate)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching transactions by date range:', error);
    return [];
  }

  return data ?? [];
}

export async function getRecentTransactions(limit = 50): Promise<AdcoinTransaction[]> {
  const { data, error } = await supabaseAdmin
    .from('adcoin_transactions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching recent transactions:', error);
    return [];
  }

  return data ?? [];
}

// ============================================
// STATISTICS
// ============================================

export interface AdcoinStats {
  totalEarned: number;
  totalSpent: number;
  totalTransferred: number;
  transactionCount: number;
}

export async function getAdcoinStats(
  startDate: string,
  endDate: string
): Promise<AdcoinStats> {
  const { data, error } = await supabaseAdmin
    .from('adcoin_transactions')
    .select('amount, type')
    .gte('created_at', startDate)
    .lte('created_at', endDate);

  if (error) {
    console.error('Error fetching adcoin stats:', error);
    return {
      totalEarned: 0,
      totalSpent: 0,
      totalTransferred: 0,
      transactionCount: 0,
    };
  }

  const transactions = data ?? [];
  const earned = transactions
    .filter(t => t.type === 'earned' || t.type === 'refunded')
    .reduce((sum, t) => sum + t.amount, 0);
  const spent = transactions
    .filter(t => t.type === 'spent')
    .reduce((sum, t) => sum + t.amount, 0);
  const transferred = transactions
    .filter(t => t.type === 'transfer')
    .reduce((sum, t) => sum + t.amount, 0);

  return {
    totalEarned: earned,
    totalSpent: spent,
    totalTransferred: transferred,
    transactionCount: transactions.length,
  };
}

export async function getTotalAdcoinBalance(branchId?: string): Promise<number> {
  let query = supabaseAdmin
    .from('students')
    .select('adcoin_balance')
    .is('deleted_at', null);

  if (branchId) {
    query = query.eq('branch_id', branchId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching total adcoin balance:', error);
    return 0;
  }

  return (data ?? []).reduce((sum, s) => sum + (s.adcoin_balance ?? 0), 0);
}

// ============================================
// WRITE OPERATIONS
// ============================================

/**
 * Award AdCoins to a student (creates transaction and updates balance)
 * receiver_id = student receiving coins, sender_id = null (system award)
 */
export async function awardAdcoins(
  studentId: string,
  amount: number,
  description?: string,
  verifiedBy?: string
): Promise<AdcoinTransaction | null> {
  const student = await getStudentById(studentId);
  if (!student) {
    console.error('Student not found:', studentId);
    return null;
  }

  const transactionData: AdcoinTransactionInsert = {
    sender_id: null, // System award
    receiver_id: studentId,
    type: 'earned',
    amount,
    description,
    verified_by: verifiedBy,
  };

  const { data: transaction, error } = await supabaseAdmin
    .from('adcoin_transactions')
    .insert(transactionData)
    .select()
    .single();

  if (error) {
    console.error('Error creating adcoin transaction:', error);
    return null;
  }

  // Update balance
  const newBalance = student.adcoin_balance + amount;
  await updateAdcoinBalance(studentId, newBalance);

  return transaction;
}

/**
 * Deduct AdCoins from a student (creates transaction and updates balance)
 * sender_id = student spending coins, receiver_id = null (system/shop)
 */
export async function spendAdcoins(
  studentId: string,
  amount: number,
  description?: string,
  verifiedBy?: string
): Promise<AdcoinTransaction | null> {
  const student = await getStudentById(studentId);
  if (!student) {
    console.error('Student not found:', studentId);
    return null;
  }

  if (student.adcoin_balance < amount) {
    console.error('Insufficient adcoin balance');
    return null;
  }

  const transactionData: AdcoinTransactionInsert = {
    sender_id: studentId,
    receiver_id: null, // System/shop
    type: 'spent',
    amount,
    description,
    verified_by: verifiedBy,
  };

  const { data: transaction, error } = await supabaseAdmin
    .from('adcoin_transactions')
    .insert(transactionData)
    .select()
    .single();

  if (error) {
    console.error('Error creating adcoin transaction:', error);
    return null;
  }

  // Update balance
  const newBalance = student.adcoin_balance - amount;
  await updateAdcoinBalance(studentId, newBalance);

  return transaction;
}

/**
 * Transfer AdCoins between students
 */
export async function transferAdcoins(
  senderId: string,
  receiverId: string,
  amount: number,
  description?: string,
  verifiedBy?: string
): Promise<AdcoinTransaction | null> {
  const sender = await getStudentById(senderId);
  const receiver = await getStudentById(receiverId);

  if (!sender || !receiver) {
    console.error('Sender or receiver not found');
    return null;
  }

  if (sender.adcoin_balance < amount) {
    console.error('Insufficient adcoin balance for transfer');
    return null;
  }

  const transactionData: AdcoinTransactionInsert = {
    sender_id: senderId,
    receiver_id: receiverId,
    type: 'transfer',
    amount,
    description: description ?? `Transfer from ${sender.name} to ${receiver.name}`,
    verified_by: verifiedBy,
  };

  const { data: transaction, error } = await supabaseAdmin
    .from('adcoin_transactions')
    .insert(transactionData)
    .select()
    .single();

  if (error) {
    console.error('Error creating transfer transaction:', error);
    return null;
  }

  // Update both balances
  await updateAdcoinBalance(senderId, sender.adcoin_balance - amount);
  await updateAdcoinBalance(receiverId, receiver.adcoin_balance + amount);

  return transaction;
}

/**
 * Adjust AdCoins (can be positive or negative, for corrections)
 */
export async function adjustAdcoins(
  studentId: string,
  amount: number,
  description?: string,
  verifiedBy?: string
): Promise<AdcoinTransaction | null> {
  const student = await getStudentById(studentId);
  if (!student) {
    console.error('Student not found:', studentId);
    return null;
  }

  // For adjustments: positive = receiver gets coins, negative = sender loses coins
  const transactionData: AdcoinTransactionInsert = {
    sender_id: amount < 0 ? studentId : null,
    receiver_id: amount >= 0 ? studentId : null,
    type: 'adjusted',
    amount: Math.abs(amount),
    description: description ?? `Manual adjustment: ${amount >= 0 ? '+' : ''}${amount}`,
    verified_by: verifiedBy,
  };

  const { data: transaction, error } = await supabaseAdmin
    .from('adcoin_transactions')
    .insert(transactionData)
    .select()
    .single();

  if (error) {
    console.error('Error creating adcoin adjustment:', error);
    return null;
  }

  // Update balance
  const newBalance = Math.max(0, student.adcoin_balance + amount);
  await updateAdcoinBalance(studentId, newBalance);

  return transaction;
}

/**
 * Refund a spent transaction
 */
export async function refundTransaction(
  originalTransactionId: string,
  verifiedBy?: string
): Promise<AdcoinTransaction | null> {
  const original = await getTransactionById(originalTransactionId);
  if (!original || original.type !== 'spent' || !original.sender_id) {
    console.error('Invalid transaction for refund');
    return null;
  }

  const student = await getStudentById(original.sender_id);
  if (!student) {
    console.error('Student not found');
    return null;
  }

  const transactionData: AdcoinTransactionInsert = {
    sender_id: null,
    receiver_id: original.sender_id,
    type: 'refunded',
    amount: original.amount,
    description: `Refund for transaction ${originalTransactionId}`,
    verified_by: verifiedBy,
  };

  const { data: transaction, error } = await supabaseAdmin
    .from('adcoin_transactions')
    .insert(transactionData)
    .select()
    .single();

  if (error) {
    console.error('Error creating refund transaction:', error);
    return null;
  }

  // Update balance
  const newBalance = student.adcoin_balance + original.amount;
  await updateAdcoinBalance(original.sender_id, newBalance);

  return transaction;
}

// ============================================
// UNIFIED OPERATIONS (supports both students and users)
// ============================================

/**
 * Unified transfer that supports both students and users as participants
 * - Students have their balance updated
 * - Users (staff) can send/receive but don't have balance tracking
 */
export async function unifiedTransfer(
  senderId: string,
  senderType: ParticipantType,
  receiverId: string,
  receiverType: ParticipantType,
  amount: number,
  description?: string,
  verifiedBy?: string
): Promise<AdcoinTransaction | null> {
  const sender = await getParticipantInfo(senderId, senderType);
  const receiver = await getParticipantInfo(receiverId, receiverType);

  if (!sender || !receiver) {
    console.error('Sender or receiver not found');
    return null;
  }

  // Only check balance for student senders
  if (senderType === 'student' && sender.adcoinBalance < amount) {
    console.error('Insufficient adcoin balance for transfer');
    return null;
  }

  const transactionData: AdcoinTransactionInsert = {
    sender_id: senderId,
    receiver_id: receiverId,
    type: 'transfer',
    amount,
    description: description ?? `Transfer from ${sender.name} to ${receiver.name}`,
    verified_by: verifiedBy,
  };

  const { data: transaction, error } = await supabaseAdmin
    .from('adcoin_transactions')
    .insert(transactionData)
    .select()
    .single();

  if (error) {
    console.error('Error creating transfer transaction:', error);
    return null;
  }

  // Update balances only for students
  if (senderType === 'student') {
    await updateAdcoinBalance(senderId, sender.adcoinBalance - amount);
  }
  if (receiverType === 'student') {
    const currentBalance = (await getStudentById(receiverId))?.adcoin_balance ?? 0;
    await updateAdcoinBalance(receiverId, currentBalance + amount);
  }

  return transaction;
}

/**
 * Unified award that supports both students and users as receivers
 */
export async function unifiedAward(
  receiverId: string,
  receiverType: ParticipantType,
  amount: number,
  description?: string,
  verifiedBy?: string
): Promise<AdcoinTransaction | null> {
  const receiver = await getParticipantInfo(receiverId, receiverType);
  if (!receiver) {
    console.error('Receiver not found:', receiverId);
    return null;
  }

  const transactionData: AdcoinTransactionInsert = {
    sender_id: null,
    receiver_id: receiverId,
    type: 'earned',
    amount,
    description,
    verified_by: verifiedBy,
  };

  const { data: transaction, error } = await supabaseAdmin
    .from('adcoin_transactions')
    .insert(transactionData)
    .select()
    .single();

  if (error) {
    console.error('Error creating adcoin transaction:', error);
    return null;
  }

  // Update balance only for students
  if (receiverType === 'student') {
    const student = await getStudentById(receiverId);
    if (student) {
      await updateAdcoinBalance(receiverId, student.adcoin_balance + amount);
    }
  }

  return transaction;
}

/**
 * Unified adjust that supports both students and users
 */
export async function unifiedAdjust(
  participantId: string,
  participantType: ParticipantType,
  amount: number,
  description?: string,
  verifiedBy?: string
): Promise<AdcoinTransaction | null> {
  const participant = await getParticipantInfo(participantId, participantType);
  if (!participant) {
    console.error('Participant not found:', participantId);
    return null;
  }

  const transactionData: AdcoinTransactionInsert = {
    sender_id: amount < 0 ? participantId : null,
    receiver_id: amount >= 0 ? participantId : null,
    type: 'adjusted',
    amount: Math.abs(amount),
    description: description ?? `Manual adjustment: ${amount >= 0 ? '+' : ''}${amount}`,
    verified_by: verifiedBy,
  };

  const { data: transaction, error } = await supabaseAdmin
    .from('adcoin_transactions')
    .insert(transactionData)
    .select()
    .single();

  if (error) {
    console.error('Error creating adcoin adjustment:', error);
    return null;
  }

  // Update balance only for students
  if (participantType === 'student') {
    const student = await getStudentById(participantId);
    if (student) {
      const newBalance = Math.max(0, student.adcoin_balance + amount);
      await updateAdcoinBalance(participantId, newBalance);
    }
  }

  return transaction;
}

// ============================================
// STUDENT TRANSACTION SUMMARY
// ============================================

export interface StudentAdcoinSummary {
  studentId: string;
  currentBalance: number;
  totalEarned: number;
  totalSpent: number;
  totalTransferred: number;
  transactionCount: number;
}

export async function getStudentAdcoinSummary(studentId: string): Promise<StudentAdcoinSummary> {
  const student = await getStudentById(studentId);
  const transactions = await getTransactionsByStudentId(studentId);

  let totalEarned = 0;
  let totalSpent = 0;
  let totalTransferred = 0;

  for (const t of transactions) {
    if (t.type === 'earned' || t.type === 'refunded') {
      if (t.receiver_id === studentId) totalEarned += t.amount;
    } else if (t.type === 'spent') {
      if (t.sender_id === studentId) totalSpent += t.amount;
    } else if (t.type === 'transfer') {
      if (t.sender_id === studentId) totalTransferred += t.amount;
      if (t.receiver_id === studentId) totalEarned += t.amount;
    } else if (t.type === 'adjusted') {
      if (t.receiver_id === studentId) totalEarned += t.amount;
      if (t.sender_id === studentId) totalSpent += t.amount;
    }
  }

  return {
    studentId,
    currentBalance: student?.adcoin_balance ?? 0,
    totalEarned,
    totalSpent,
    totalTransferred,
    transactionCount: transactions.length,
  };
}

// ============================================
// TRANSACTION DISPLAY
// ============================================

export interface TransactionDisplayRow {
  id: string;
  createdAt: string;
  type: AdcoinTransactionType;
  amount: number;
  description: string | null;
  // Sender info
  senderId: string | null;
  senderName: string | null;
  senderPhoto: string | null;
  senderLevel: number;
  // Receiver info
  receiverId: string | null;
  receiverName: string | null;
  receiverPhoto: string | null;
  receiverLevel: number;
  // Branch (from receiver or sender)
  branchId: string;
  branchName: string;
}

export async function getTransactionsForDisplay(): Promise<TransactionDisplayRow[]> {
  // Fetch transactions
  const { data: transactions, error: txError } = await supabaseAdmin
    .from('adcoin_transactions')
    .select('*')
    .order('created_at', { ascending: false });

  if (txError) {
    console.error('Error fetching transactions:', txError);
    return [];
  }

  if (!transactions || transactions.length === 0) {
    return [];
  }

  // Collect all unique student IDs
  const studentIds = new Set<string>();
  for (const t of transactions) {
    if (t.sender_id) studentIds.add(t.sender_id);
    if (t.receiver_id) studentIds.add(t.receiver_id);
  }

  // Fetch all relevant students with their branches
  const { data: students, error: studentError } = await supabaseAdmin
    .from('students')
    .select(`
      id,
      name,
      photo,
      branch_id,
      adcoin_balance,
      branch:branches(id, name)
    `)
    .in('id', Array.from(studentIds));

  if (studentError) {
    console.error('Error fetching students:', studentError);
  }

  // Create a lookup map for students
  const studentMap = new Map<string, {
    id: string;
    name: string;
    photo: string | null;
    branch_id: string;
    branchName: string;
    level: number;
  }>();

  for (const student of students ?? []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const branchData = student.branch as any;
    // Calculate level: every 500 adcoin = 1 level, starting at 1
    const adcoinBalance = student.adcoin_balance ?? 0;
    const level = Math.floor(adcoinBalance / 500) + 1;
    studentMap.set(student.id, {
      id: student.id,
      name: student.name,
      photo: student.photo,
      branch_id: student.branch_id,
      branchName: branchData?.name ?? 'Unknown',
      level,
    });
  }

  const rows: TransactionDisplayRow[] = [];

  for (const t of transactions) {
    const sender = t.sender_id ? studentMap.get(t.sender_id) : null;
    const receiver = t.receiver_id ? studentMap.get(t.receiver_id) : null;

    // Determine branch from receiver or sender
    const branchStudent = receiver ?? sender;

    rows.push({
      id: t.id,
      createdAt: t.created_at,
      type: t.type as AdcoinTransactionType,
      amount: Math.abs(t.amount),
      description: t.description,
      senderId: sender?.id ?? null,
      senderName: sender?.name ?? null,
      senderPhoto: sender?.photo ?? null,
      senderLevel: sender?.level ?? 1,
      receiverId: receiver?.id ?? null,
      receiverName: receiver?.name ?? null,
      receiverPhoto: receiver?.photo ?? null,
      receiverLevel: receiver?.level ?? 1,
      branchId: branchStudent?.branch_id ?? '',
      branchName: branchStudent?.branchName ?? 'Unknown',
    });
  }

  return rows;
}
