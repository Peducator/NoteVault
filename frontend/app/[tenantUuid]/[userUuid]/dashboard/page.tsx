'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { ShieldAlert, LogOut, ArrowRight, RefreshCw } from 'lucide-react';
import { Sidebar } from '../../../components/Sidebar';
import { Header } from '../../../components/Header';
import { BudgetStats } from '../../../components/BudgetStats';
import { ExpenseTable } from '../../../components/ExpenseTable';
import { CategoryBreakdown } from '../../../components/CategoryBreakdown';
import { ExpenseModal } from '../../../components/ExpenseModal';
import { AdminTeamManagement } from '../../../components/AdminTeamManagement';
import { useExpenses } from '../../../hooks/useExpenses';
import { userApi, UserProfile } from '../../../apis/userApi';
import { authApi } from '../../../apis/authApi';

function TenantUserDashboardContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  
  const tenantUuidParam = params?.tenantUuid as string;
  const userUuidParam = params?.userUuid as string;
  const tabParam = searchParams.get('tab');

  const [activeTab, setActiveTab] = useState(tabParam || 'overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  const { expenses, isFetching, addExpense } = useExpenses();

  useEffect(() => {
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  // Kiểm tra đăng nhập và đối soát quyền hạn qua UUID
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const token = localStorage.getItem('nv_access_token');
    const storedUserStr = localStorage.getItem('nv_user');

    if (!token) {
      router.replace('/login');
      return;
    }

    let localUser: UserProfile | null = null;
    if (storedUserStr) {
      try {
        localUser = JSON.parse(storedUserStr);
        setCurrentUser(localUser);
      } catch (e) {
        // ignore json parse error
      }
    }

    // Xác thực sâu từ backend API Profile
    userApi.getProfile()
      .then((res) => {
        if (res.success && res.data) {
          const profile = {
            ...res.data,
            companyName: res.data.tenant?.companyName || res.data.companyName || 'Doanh nghiệp',
            companyUuid: res.data.tenant?.uuid || res.data.companyUuid,
          };
          setCurrentUser(profile);
          localStorage.setItem('nv_user', JSON.stringify(profile));

          const userUuid = profile.uuid;
          const compUuid = profile.companyUuid;

          // Đối soát quyền: URL params phải trùng với user profile
          const matched = (userUuid === userUuidParam) && (compUuid === tenantUuidParam);
          setIsAuthorized(matched);
        } else {
          // Token hỏng hoặc hết hạn
          setIsAuthorized(false);
        }
      })
      .catch(() => {
        // Kiểm tra đối soát dự phòng bằng localUser nếu backend lag
        if (localUser) {
          const uUuid = localUser.uuid;
          const cUuid = localUser.companyUuid || localUser.tenant?.uuid;
          setIsAuthorized(uUuid === userUuidParam && cUuid === tenantUuidParam);
        } else {
          setIsAuthorized(false);
        }
      })
      .finally(() => {
        setIsLoadingAuth(false);
      });
  }, [tenantUuidParam, userUuidParam, router]);

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } finally {
      router.replace('/login');
    }
  };

  // 1. Màn hình đang kiểm tra quyền
  if (isLoadingAuth) {
    return (
      <div className="flex h-screen bg-zinc-50 dark:bg-zinc-950 items-center justify-center text-zinc-500 dark:text-zinc-400 text-sm gap-2 transition-colors">
        <RefreshCw className="w-4 h-4 animate-spin text-zinc-700 dark:text-zinc-300" />
        <span>Đang đối soát quyền truy cập định danh UUID...</span>
      </div>
    );
  }

  // 2. Màn hình từ chối truy cập (UUID Mismatch / IDOR Prevention)
  if (isAuthorized === false) {
    const validCompUuid = currentUser?.companyUuid || currentUser?.tenant?.uuid;
    const validUserUuid = currentUser?.uuid;

    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-6 text-zinc-900 dark:text-zinc-100 transition-colors">
        <div className="max-w-md w-full nv-card p-8 text-center space-y-6 border border-zinc-200 dark:border-zinc-800 shadow-xl">
          <div className="w-14 h-14 bg-red-100 dark:bg-red-950/60 rounded-2xl flex items-center justify-center mx-auto text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50">
            <ShieldAlert className="w-7 h-7" />
          </div>

          <div className="space-y-2">
            <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Truy cập bị từ chối
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Cặp định danh UUID trong đường dẫn không khớp với phiên làm việc của tài khoản hiện tại.
              Hệ thống đã kích hoạt cơ chế bảo mật chống can thiệp URL (IDOR Protection).
            </p>
          </div>

          <div className="bg-zinc-100 dark:bg-zinc-900/80 p-3.5 rounded-lg text-left text-xs font-mono space-y-1.5 border border-zinc-200 dark:border-zinc-800">
            <div className="text-zinc-500 dark:text-zinc-400">
              URL yêu cầu:
              <div className="text-red-600 dark:text-red-400 truncate">
                /{tenantUuidParam?.slice(0, 8)}.../{userUuidParam?.slice(0, 8)}...
              </div>
            </div>
            {validCompUuid && (
              <div className="text-zinc-500 dark:text-zinc-400 pt-1 border-t border-zinc-200 dark:border-zinc-800">
                Tài khoản của bạn:
                <div className="text-emerald-600 dark:text-emerald-400 truncate">
                  /{validCompUuid.slice(0, 8)}.../{validUserUuid?.slice(0, 8)}...
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2.5 pt-2">
            {validCompUuid && validUserUuid ? (
              <button
                onClick={() => router.replace(`/${validCompUuid}/${validUserUuid}/dashboard`)}
                className="nv-btn-primary w-full py-2.5 text-xs font-semibold flex items-center justify-center gap-2"
              >
                <span>Về Dashboard chính chủ của bạn</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : null}

            <button
              onClick={handleLogout}
              className="nv-btn-secondary w-full py-2.5 text-xs font-medium flex items-center justify-center gap-2 text-zinc-600 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Đăng xuất & Đăng nhập tài khoản khác</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. Người dùng hợp lệ -> Render Dashboard đầy đủ
  const pendingReimbursement = expenses
    .filter((e) => e.approvalStatus === 'PENDING')
    .reduce((sum, e) => sum + e.amount, 0);

  const approvedReimbursed = expenses
    .filter((e) => e.approvalStatus === 'APPROVED')
    .reduce((sum, e) => sum + e.amount, 0);

  const departmentAllowance = 25000000;
  const usedAmount = approvedReimbursed;
  const usagePercent = departmentAllowance > 0
    ? Math.min(100, Math.round((usedAmount / departmentAllowance) * 100))
    : 0;

  const budget = {
    departmentName: currentUser?.department || 'Phòng ban',
    allowance: departmentAllowance,
    usedAmount: usedAmount,
    pendingReimbursement,
    approvedReimbursed,
  };

  const categoryColors: Record<string, string> = {
    'Phần mềm': 'bg-zinc-900 dark:bg-zinc-100',
    'Ăn uống': 'bg-zinc-700 dark:bg-zinc-300',
    'Đi lại': 'bg-zinc-500 dark:bg-zinc-400',
    'Mua sắm': 'bg-zinc-400 dark:bg-zinc-500',
  };

  const totalExpenseSum = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const categoryTotals = expenses.reduce((acc, curr) => {
    const cat = curr.category || 'Khác';
    acc[cat] = (acc[cat] || 0) + (curr.amount || 0);
    return acc;
  }, {} as Record<string, number>);

  const dynamicCategories = Object.entries(categoryTotals).map(([label, amount]) => ({
    label,
    amount,
    percent: totalExpenseSum > 0 ? Math.round((amount / totalExpenseSum) * 100) : 0,
    color: categoryColors[label] || 'bg-zinc-600 dark:bg-zinc-400',
  })).sort((a, b) => b.amount - a.amount);

  const getPageTitle = () => {
    if (activeTab === 'users' || activeTab === 'team') return 'Quản lý Người dùng';
    if (activeTab === 'expenses') return 'Hóa đơn & Chứng từ';
    if (activeTab === 'reports') return 'Báo cáo & Sao kê chi tiêu';
    return 'Chi tiêu';
  };

  return (
    <div className="flex h-screen bg-zinc-50 dark:bg-zinc-950 font-sans text-zinc-900 dark:text-zinc-100 overflow-hidden selection:bg-zinc-200 dark:selection:bg-zinc-800 transition-colors">
      
      {/* Sidebar điều hướng */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        activeTab={activeTab}
        onTabChange={(tab) => {
          setIsSidebarOpen(false);
          if (tab === 'logout' || tab === 'settings') {
            handleLogout();
          } else if (tab === 'users') {
            router.push(`/${tenantUuidParam}/${userUuidParam}/users`);
          } else {
            setActiveTab(tab);
          }
        }}
        tenantName={currentUser?.companyName || 'Doanh nghiệp'}
        userName={currentUser?.name || currentUser?.email || 'Người dùng'}
        departmentName={currentUser?.department || 'Phòng ban'}
        userRole={currentUser?.role || 'USER'}
      />

      {/* Khu vực nội dung chính */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* Top Header */}
        <Header
          title={getPageTitle()}
          isSyncing={isFetching}
          onNewExpenseClick={() => setIsModalOpen(true)}
          onToggleMenu={() => setIsSidebarOpen(true)}
        />

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
          {activeTab === 'users' || activeTab === 'team' ? (
            <AdminTeamManagement />
          ) : (
            <>
              {/* Thẻ Hạn mức phòng ban */}
              <BudgetStats
                departmentName={budget.departmentName}
                allowance={budget.allowance}
                usedAmount={budget.usedAmount}
                pendingReimbursement={budget.pendingReimbursement}
                approvedReimbursed={budget.approvedReimbursed}
              />

              {/* Grid 12 cột: Table 8 cột + Breakdown 4 cột */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="col-span-1 lg:col-span-8">
                  <ExpenseTable
                    expenses={expenses}
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    onViewAll={() => setActiveTab('expenses')}
                  />
                </div>
                <div className="col-span-1 lg:col-span-4">
                  <CategoryBreakdown
                    categories={dynamicCategories}
                    departmentName={budget.departmentName}
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
        onSubmit={async (data) => {
          setIsModalOpen(false);
          await addExpense({
            amount: Number(data.amount) || 0,
            category: data.category || 'Ăn uống',
            purpose: data.purpose || 'Chi phí công tác',
            taxCode: data.taxCode,
            vendorName: data.vendorName,
            receiptUrl: data.receiptUrl,
          });
        }}
      />
    </div>
  );
}

export default function TenantUserDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen bg-zinc-50 dark:bg-zinc-950 items-center justify-center text-zinc-400 text-sm">
          Đang nạp dữ liệu...
        </div>
      }
    >
      <TenantUserDashboardContent />
    </Suspense>
  );
}
