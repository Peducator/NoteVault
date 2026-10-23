'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Expense } from '../types/expense';
import { expenseApi } from '../apis/expenseApi';

export interface NewExpensePayload {
  amount: number;
  category: string;
  categoryId?: number;
  purpose: string;
  unitId?: number;
  taxCode?: string;
  vendorName?: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  vatAmount?: number;
  vatRate?: string;
  receiptUrl?: string;
}

const LOCAL_STORAGE_KEY = 'nv_cached_expenses';

function getLocalExpenses(): Expense[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveLocalExpenses(expenses: Expense[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(expenses));
  } catch (e) {
    console.error('Không thể lưu cache chi tiêu cục bộ', e);
  }
}

/**
 * Fetch danh sách chi tiêu:
 * - Nếu có JWT Token, gọi API Backend GET /api/transactions
 * - Tự động đồng bộ và fallback mượt mà về dữ liệu cục bộ nếu chưa đăng nhập hoặc mạng gián đoạn
 */
async function fetchExpenses(): Promise<Expense[]> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('nv_access_token') : null;
  const localList = getLocalExpenses();

  if (!token) {
    return localList;
  }

  try {
    const json = await expenseApi.getTransactions(50);
    const rawTransactions = json.data?.items || json.data?.transactions || (Array.isArray(json.data) ? json.data : []);

    if (!Array.isArray(rawTransactions)) {
      return localList;
    }

    // Map dữ liệu từ backend sang cấu trúc Expense chuẩn
    const mapped: Expense[] = rawTransactions.map((tx: any) => {
      const catName = tx.category?.name || 'Khác';
      const scanStatus = tx.scanStatus === 'INFECTED' ? 'INFECTED' : tx.scanStatus === 'PENDING_SCAN' ? 'PENDING_SCAN' : 'CLEAN';
      const approvalStatus = tx.status === 'REJECTED' ? 'REJECTED' : tx.status === 'APPROVED' ? 'APPROVED' : tx.status === 'PAID' ? 'PAID' : 'SUBMITTED';

      return {
        id: `EXP-${tx.id}`,
        user: tx.user?.fullName || tx.user?.name || 'Người dùng',
        userId: tx.userId,
        purpose: tx.note || 'Chi phí công tác',
        category: catName,
        date: tx.transactionDate ? String(tx.transactionDate).split('T')[0] : new Date().toISOString().split('T')[0],
        amount: Number(tx.amount) || 0,
        scanStatus,
        approvalStatus,
        taxCode: tx.taxCode,
        vendorName: tx.vendorName,
        receiptUrl: tx.s3Key || tx.receiptUrl,
        unitId: tx.unitId,
        unitName: tx.unit?.name,
        rejectionReason: tx.rejectionReason,
        approverName: tx.approver?.name || tx.approver?.email,
        approvedAt: tx.approvedAt ? String(tx.approvedAt).split('T')[0] : undefined,
        invoiceNumber: tx.invoiceNumber,
        vatAmount: tx.vatAmount ? Number(tx.vatAmount) : undefined,
        categoryId: tx.categoryId,
      };
    });

    saveLocalExpenses(mapped);
    return mapped;
  } catch (error) {
    console.warn('[Sync] Không thể kết nối máy chủ, sử dụng dữ liệu cục bộ:', error);
    return localList;
  }
}

/**
 * Hook quản lý trạng thái chi tiêu với TanStack Query:
 * - Hỗ trợ polling định kỳ (refetchInterval: 5000)
 * - Tự động refetch khi người dùng active tab (refetchOnWindowFocus)
 * - Mutation nộp hóa đơn mới với optimistic update và tự động invalidate cache
 * - Mutation Duyệt & Từ chối giao dịch chuẩn cấp quản lý trực tiếp
 */
export function useExpenses() {
  const queryClient = useQueryClient();

  // 1. Query: Tự động polling và cập nhật dữ liệu
  const {
    data: expenses = getLocalExpenses(),
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useQuery<Expense[]>({
    queryKey: ['expenses'],
    queryFn: fetchExpenses,
    placeholderData: getLocalExpenses,
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
    staleTime: 3000,
  });

  // 2. Mutation: Nộp hóa đơn chi tiêu mới
  const addExpenseMutation = useMutation({
    mutationFn: async (payload: NewExpensePayload) => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('nv_access_token') : null;
      const currentUser = typeof window !== 'undefined' && localStorage.getItem('nv_user') 
        ? JSON.parse(localStorage.getItem('nv_user') || '{}') 
        : { fullName: 'Người dùng' };

      // Gửi lên backend nếu có token
      if (token) {
        const noteParts = [
          payload.purpose,
          payload.vendorName ? `[Đơn vị bán: ${payload.vendorName}]` : '',
          payload.invoiceNumber ? `[Số HĐ: ${payload.invoiceNumber}]` : '',
          payload.taxCode ? `[MST: ${payload.taxCode}]` : '',
          payload.vatAmount ? `[VAT: ${payload.vatAmount.toLocaleString('vi-VN')} đ]` : '',
        ].filter(Boolean).join(' • ');

        const res = await expenseApi.createTransaction({
          amount: payload.amount,
          categoryId: payload.categoryId,
          category: payload.category,
          unitId: payload.unitId,
          note: noteParts,
          transactionDate: payload.invoiceDate ? new Date(payload.invoiceDate).toISOString() : new Date().toISOString(),
          scanStatus: 'CLEAN',
          taxCode: payload.taxCode,
          vendorName: payload.vendorName,
          receiptUrl: payload.receiptUrl,
        });

        if (res?.data) {
          const createdTx = res.data;
          return {
            id: `EXP-${createdTx.id}`,
            user: currentUser.fullName || currentUser.name || 'Người dùng',
            purpose: createdTx.note,
            category: payload.category || 'Chi phí',
            date: payload.invoiceDate || new Date().toISOString().split('T')[0],
            amount: Number(createdTx.amount),
            scanStatus: 'CLEAN' as const,
            approvalStatus: createdTx.status as any,
            unitId: createdTx.unitId,
          };
        }
      }

      const fallbackExpense: Expense = {
        id: `EXP-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        user: currentUser.fullName || currentUser.name || 'Người dùng',
        purpose: payload.purpose || 'Chi phí công tác',
        category: payload.category || 'Ăn uống',
        date: new Date().toISOString().split('T')[0],
        amount: Number(payload.amount) || 0,
        scanStatus: 'CLEAN',
        approvalStatus: 'SUBMITTED',
        taxCode: payload.taxCode,
        vendorName: payload.vendorName,
        receiptUrl: payload.receiptUrl,
      };

      const current = getLocalExpenses();
      saveLocalExpenses([fallbackExpense, ...current]);
      return fallbackExpense;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['unitTree'] });
    },
  });

  // 3. Mutation: Phê duyệt giao dịch
  const approveExpenseMutation = useMutation({
    mutationFn: async (expenseId: string | number) => {
      const numericId = String(expenseId).replace(/^EXP-/, '');
      return expenseApi.approveTransaction(numericId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['unitTree'] });
    },
  });

  // 4. Mutation: Từ chối giao dịch với lý do
  const rejectExpenseMutation = useMutation({
    mutationFn: async (payload: { expenseId: string | number; reason: string }) => {
      const numericId = String(payload.expenseId).replace(/^EXP-/, '');
      return expenseApi.rejectTransaction(numericId, payload.reason);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['unitTree'] });
    },
  });

  const approveExpense = async (expenseId: string | number) => {
    return approveExpenseMutation.mutateAsync(expenseId);
  };

  const rejectExpense = async (
    arg1: string | number | { expenseId: string | number; reason: string },
    arg2?: string
  ) => {
    let expenseId: string | number = '';
    let reason = '';
    if (typeof arg1 === 'object' && arg1 !== null) {
      expenseId = arg1.expenseId;
      reason = arg1.reason;
    } else {
      expenseId = arg1;
      reason = arg2 || '';
    }
    return rejectExpenseMutation.mutateAsync({ expenseId, reason });
  };

  // 5. Mutation: Hoàn ứng giao dịch (PAID - Đã thanh toán)
  const payExpenseMutation = useMutation({
    mutationFn: async (expenseId: string | number) => {
      const numericId = String(expenseId).replace(/^EXP-/, '');
      return expenseApi.payTransaction(numericId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['unitTree'] });
    },
  });

  const payExpense = async (expenseId: string | number) => {
    return payExpenseMutation.mutateAsync(expenseId);
  };

  return {
    expenses,
    isLoading,
    isFetching,
    isError,
    refetch,
    addExpense: addExpenseMutation.mutateAsync,
    isAdding: addExpenseMutation.isPending,
    approveExpense,
    isApproving: approveExpenseMutation.isPending,
    rejectExpense,
    isRejecting: rejectExpenseMutation.isPending,
    payExpense,
    isPaying: payExpenseMutation.isPending,
  };
}
