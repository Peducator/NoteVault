'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { RefreshCw } from 'lucide-react';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';
import { BudgetStats } from '../components/BudgetStats';
import { ExpenseTable } from '../components/ExpenseTable';
import { CategoryBreakdown } from '../components/CategoryBreakdown';
import { ExpenseModal } from '../components/ExpenseModal';
import { AdminTeamManagement } from '../components/AdminTeamManagement';
import { useExpenses } from '../hooks/useExpenses';
import { userApi, UserProfile } from '../apis/userApi';
import { authApi } from '../apis/authApi';

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');

  const [activeTab, setActiveTab] = useState(tabParam || 'overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  const { 
    expenses, 
    isFetching, 
    addExpense, 
    approveExpense, 
    isApproving, 
    rejectExpense, 
    isRejecting, 
    payExpense,
    isPaying,
    refetch 
  } = useExpenses();

  useEffect(() => {
    if (tabParam === 'logout') {
      handleLogout();
    } else if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  // Kiểm tra đăng nhập và nạp thông tin người dùng từ Token JWT
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const token = localStorage.getItem('nv_access_token');
    const storedUserStr = localStorage.getItem('nv_user');

    if (!token) {
      router.replace('/login');
      return;
    }

    if (storedUserStr) {
      try {
        const localUser = JSON.parse(storedUserStr);
        setCurrentUser(localUser);
      } catch (e) {
        // ignore parse error
      }
    }

    // Lấy profile chính chủ từ Backend
    userApi.getProfile()
      .then((res) => {
        if (res.success && res.data) {
          const profile = {
            ...res.data,
            companyName: res.data.tenant?.companyName || res.data.companyName || 'Doanh nghiệp',
          };
          setCurrentUser(profile);
          localStorage.setItem('nv_user', JSON.stringify(profile));
        } else {
          router.replace('/login');
        }
      })
      .catch(() => {
        // Nếu có token nhưng backend trả lỗi (ví dụ token hết hạn)
        if (!localStorage.getItem('nv_access_token')) {
          router.replace('/login');
        }
      })
      .finally(() => {
        setIsLoadingAuth(false);
      });
  }, [router]);

  const handleTabChange = (tabId: string) => {
    if (tabId === 'logout') {
      handleLogout();
      return;
    }
    setActiveTab(tabId);
    if (tabId === 'overview') {
      router.push('/dashboard');
    } else {
      router.push(`/dashboard?tab=${tabId}`);
    }
  };

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } finally {
      localStorage.removeItem('nv_access_token');
      localStorage.removeItem('nv_refresh_token');
      localStorage.removeItem('nv_user');
      router.replace('/login');
    }
  };

  // Màn hình loading khi kiểm tra token
  if (isLoadingAuth) {
    return (
      <div className="flex h-screen bg-zinc-50 dark:bg-zinc-950 items-center justify-center text-zinc-500 dark:text-zinc-400 text-sm gap-2 transition-colors">
        <RefreshCw className="w-4 h-4 animate-spin text-zinc-700 dark:text-zinc-300" />
        <span>Đang tải bảng điều khiển...</span>
      </div>
    );
  }

  // Tính toán số liệu tổng quan
  const pendingReimbursement = expenses
    .filter((e) => e.approvalStatus === 'SUBMITTED' || e.approvalStatus === 'PENDING')
    .reduce((sum, e) => sum + (e.amount || 0), 0);

  const approvedReimbursed = expenses
    .filter((e) => e.approvalStatus === 'APPROVED')
    .reduce((sum, e) => sum + (e.amount || 0), 0);

  const budget = {
    allowance: 20000000,
    usedAmount: approvedReimbursed,
    pendingReimbursement,
    approvedReimbursed,
  };

  const usagePercent = Math.min(100, Math.round((budget.usedAmount / budget.allowance) * 100));

  // Nhóm danh mục chi tiêu cho biểu đồ
  const dynamicCategories = expenses.reduce((acc: any[], exp) => {
    const catName = exp.category || 'Khác';
    const found = acc.find((c) => c.name === catName);
    if (found) {
      found.spent += exp.amount || 0;
    } else {
      acc.push({
        id: catName,
        name: catName,
        spent: exp.amount || 0,
        allocated: 5000000,
      });
    }
    return acc;
  }, []);

  const getPageTitle = () => {
    switch (activeTab) {
      case 'expenses':
        return 'Sổ cái & Hóa đơn chi tiêu';
      case 'units':
        return 'Cây Đơn Vị & Ngân Sách Phân Tầng';
      case 'users':
      case 'team':
        return 'Thành viên & Cấu trúc nhân sự';
      default:
        return 'Tổng quan tài chính & Sổ cái';
    }
  };

  return (
    <div className="flex h-screen bg-zinc-50 dark:bg-zinc-950 font-sans selection:bg-zinc-200 dark:selection:bg-zinc-800 transition-colors">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onLogout={handleLogout}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        tenantName={currentUser?.tenant?.companyName || currentUser?.companyName || 'Doanh nghiệp'}
        userName={currentUser?.name || currentUser?.email || 'Người dùng'}
        departmentName={(currentUser as any)?.unit?.name || currentUser?.department || 'Đơn vị'}
        unitName={(currentUser as any)?.unit?.name}
        userRole={currentUser?.role || 'MEMBER'}
      />

      {/* Khu vực nội dung chính */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <Header
          title={getPageTitle()}
          isSyncing={isFetching}
          onNewExpenseClick={() => setIsModalOpen(true)}
          onToggleMenu={() => setIsSidebarOpen(true)}
          onLogout={handleLogout}
        />

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
          {activeTab === 'units' || activeTab === 'users' || activeTab === 'team' ? (
            <AdminTeamManagement onRefreshStats={refetch} />
          ) : (
            <>
              {/* Thẻ Hạn mức phòng ban */}
              <BudgetStats
                departmentName={(currentUser as any)?.unit?.name || currentUser?.department || 'Đơn vị'}
                allowance={budget.allowance}
                usedAmount={budget.usedAmount}
                pendingReimbursement={budget.pendingReimbursement}
                approvedReimbursed={budget.approvedReimbursed}
              />

              {/* Grid 12 cột: Table 9 cột + Breakdown 3 cột */}
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                <div className="col-span-1 xl:col-span-9">
                  <ExpenseTable
                    expenses={expenses}
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    onViewAll={() => handleTabChange('expenses')}
                    onApprove={approveExpense}
                    onReject={rejectExpense}
                    onPay={payExpense}
                    isApproving={isApproving}
                    isRejecting={isRejecting}
                    isPaying={isPaying}
                    currentUserId={currentUser?.id}
                    currentUserRole={currentUser?.role}
                  />
                </div>
                <div className="col-span-1 xl:col-span-3">
                  <CategoryBreakdown
                    categories={dynamicCategories}
                    departmentName={(currentUser as any)?.unit?.name || currentUser?.department || 'Đơn vị'}
                    usagePercent={usagePercent}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </main>

      {/* Modal nộp hóa đơn */}
      <ExpenseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        defaultUnitId={(currentUser as any)?.unitId}
        onSubmit={async (data) => {
          setIsModalOpen(false);
          await addExpense({
            amount: Number(data.amount) || 0,
            category: data.category || 'Ăn uống',
            purpose: data.purpose || 'Chi phí công tác',
            unitId: data.unitId || (currentUser as any)?.unitId,
            taxCode: data.taxCode,
            vendorName: data.vendorName,
            receiptUrl: data.receiptUrl,
          });
        }}
      />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen bg-zinc-50 dark:bg-zinc-950 items-center justify-center text-zinc-500 dark:text-zinc-400 text-sm gap-2">
        <RefreshCw className="w-4 h-4 animate-spin text-zinc-700 dark:text-zinc-300" />
        <span>Đang nạp ứng dụng...</span>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}
