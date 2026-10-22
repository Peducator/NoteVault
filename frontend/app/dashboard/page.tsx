'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Layout, Row, Col, Spin, Flex } from 'antd';
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

const { Content } = Layout;

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
    refetch,
  } = useExpenses();

  useEffect(() => {
    if (tabParam === 'logout') {
      handleLogout();
    } else if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

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
      } catch (e) {}
    }

    userApi
      .getProfile()
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

  if (isLoadingAuth) {
    return (
      <Flex justify="center" align="center" style={{ height: '100vh' }}>
        <Spin size="large" description="Đang tải bảng điều khiển..." />
      </Flex>
    );
  }

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
    <Layout hasSider style={{ minHeight: '100vh' }}>
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

      <Layout>
        <Header
          title={getPageTitle()}
          isSyncing={isFetching}
          onNewExpenseClick={() => setIsModalOpen(true)}
          onToggleMenu={() => setIsSidebarOpen(true)}
          onLogout={handleLogout}
        />

        <Content style={{ padding: '24px', overflowY: 'auto' }}>
          {activeTab === 'units' || activeTab === 'users' || activeTab === 'team' ? (
            <AdminTeamManagement onRefreshStats={refetch} />
          ) : (
            <Flex vertical gap="large">
              <BudgetStats
                departmentName={(currentUser as any)?.unit?.name || currentUser?.department || 'Đơn vị'}
                allowance={budget.allowance}
                usedAmount={budget.usedAmount}
                pendingReimbursement={budget.pendingReimbursement}
                approvedReimbursed={budget.approvedReimbursed}
              />

              <Row gutter={[24, 24]}>
                <Col xs={24} xl={18}>
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
                </Col>
                <Col xs={24} xl={6}>
                  <CategoryBreakdown
                    categories={dynamicCategories}
                    departmentName={(currentUser as any)?.unit?.name || currentUser?.department || 'Đơn vị'}
                    usagePercent={usagePercent}
                  />
                </Col>
              </Row>
            </Flex>
          )}
        </Content>
      </Layout>

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
    </Layout>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <Flex justify="center" align="center" style={{ height: '100vh' }}>
          <Spin size="large" description="Đang tải dữ liệu..." />
        </Flex>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
