'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Expense } from '../types/expense';
import { expenseApi } from '../apis/expenseApi';

export interface NewExpensePayload {
  amount: number;
  category: 'Ăn uống' | 'Đi lại' | 'Mua sắm' | 'Phần mềm';
  purpose: string;
  taxCode?: string;
  vendorName?: string;
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

function getApiBaseUrl(): string {
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    return process.env.NEXT_PUBLIC_API_URL || `http://${window.location.hostname}:5000`;
  }
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
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
      let cat: 'Ăn uống' | 'Đi lại' | 'Mua sắm' | 'Phần mềm' = 'Ăn uống';
      const catName = tx.category?.name || '';
      if (catName.includes('Đi lại') || catName.includes('Di chuyển')) cat = 'Đi lại';
      else if (catName.includes('Mua sắm') || catName.includes('Thiết bị')) cat = 'Mua sắm';
      else if (catName.includes('Phần mềm') || catName.includes('Dịch vụ')) cat = 'Phần mềm';

      const scanStatus = tx.scanStatus === 'INFECTED' ? 'INFECTED' : tx.scanStatus === 'PENDING_SCAN' ? 'PENDING_SCAN' : 'CLEAN';
      const approvalStatus = tx.status === 'REJECTED' ? 'REJECTED' : tx.status === 'APPROVED' ? 'APPROVED' : 'PENDING';

      return {
        id: `EXP-${tx.id}`,
        user: tx.user?.fullName || tx.user?.name || 'Người dùng',
        purpose: tx.note || 'Chi phí công tác',
        category: cat,
        date: tx.transactionDate ? String(tx.transactionDate).split('T')[0] : new Date().toISOString().split('T')[0],
        amount: Number(tx.amount) || 0,
        scanStatus,
        approvalStatus,
        taxCode: tx.taxCode,
        vendorName: tx.vendorName,
        receiptUrl: tx.s3Key || tx.receiptUrl,
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
    refetchInterval: 5000, // Polling định kỳ mỗi 5s để đồng bộ trên mọi thiết bị
    refetchOnWindowFocus: true, // Khi mở lại ứng dụng/tab, tự động tải dữ liệu mới nhất
    staleTime: 3000,
  });

  // 2. Mutation: Nộp hóa đơn chi tiêu mới
  const addExpenseMutation = useMutation({
    mutationFn: async (payload: NewExpensePayload) => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('nv_access_token') : null;
      const currentUser = typeof window !== 'undefined' && localStorage.getItem('nv_user') 
        ? JSON.parse(localStorage.getItem('nv_user') || '{}') 
        : { fullName: 'Người dùng' };

      const newExpenseItem: Expense = {
        id: `EXP-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        user: currentUser.fullName || currentUser.name || 'Người dùng',
        purpose: payload.purpose || 'Chi phí công tác',
        category: payload.category || 'Ăn uống',
        date: new Date().toISOString().split('T')[0],
        amount: Number(payload.amount) || 0,
        scanStatus: 'CLEAN',
        approvalStatus: 'PENDING',
        taxCode: payload.taxCode,
        vendorName: payload.vendorName,
        receiptUrl: payload.receiptUrl,
      };

      // Gửi lên backend nếu có token
      if (token) {
        try {
          await expenseApi.createTransaction({
            amount: payload.amount,
            categoryId: 1, // Default category ID
            note: payload.purpose,
            transactionDate: new Date().toISOString(),
            scanStatus: 'CLEAN',
            taxCode: payload.taxCode,
            vendorName: payload.vendorName,
            receiptUrl: payload.receiptUrl,
          });
        } catch (e) {
          console.warn('[Sync] Lỗi lưu giao dịch lên máy chủ, lưu cục bộ:', e);
        }
      }

      // Lưu vào cache cục bộ
      const current = getLocalExpenses();
      const updated = [newExpenseItem, ...current];
      saveLocalExpenses(updated);

      return newExpenseItem;
    },
    onSuccess: (newExpense) => {
      // Cập nhật ngay lập tức query cache trong bộ nhớ
      queryClient.setQueryData<Expense[]>(['expenses'], (old = []) => [newExpense, ...old]);
      // Invalidate để TanStack Query đồng bộ với server
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    },
  });

  return {
    expenses,
    isLoading,
    isFetching,
    isError,
    refetch,
    addExpense: addExpenseMutation.mutateAsync,
    isAdding: addExpenseMutation.isPending,
  };
}
