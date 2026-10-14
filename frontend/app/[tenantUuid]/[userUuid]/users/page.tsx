'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ShieldAlert, ShieldX, LogOut, ArrowRight, RefreshCw } from 'lucide-react';
import { Sidebar } from '../../../components/Sidebar';
import { Header } from '../../../components/Header';
import { AdminTeamManagement } from '../../../components/AdminTeamManagement';
import { userApi, UserProfile } from '../../../apis/userApi';
import { authApi } from '../../../apis/authApi';

function TenantUserManagementContent() {
  const router = useRouter();
  const params = useParams();

  const tenantUuidParam = params?.tenantUuid as string;
  const userUuidParam = params?.userUuid as string;

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

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
        // ignore
      }
    }

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

          const matched = (userUuid === userUuidParam) && (compUuid === tenantUuidParam);
          setIsAuthorized(matched);
          setIsAdmin(profile.role === 'ADMIN');
        } else {
          setIsAuthorized(false);
        }
      })
      .catch(() => {
        if (localUser) {
          const uUuid = localUser.uuid;
          const cUuid = localUser.companyUuid || localUser.tenant?.uuid;
          setIsAuthorized(uUuid === userUuidParam && cUuid === tenantUuidParam);
          setIsAdmin(localUser.role === 'ADMIN');
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

  if (isLoadingAuth) {
    return (
      <div className="flex h-screen bg-zinc-50 dark:bg-zinc-950 items-center justify-center text-zinc-500 dark:text-zinc-400 text-sm gap-2 transition-colors">
        <RefreshCw className="w-4 h-4 animate-spin text-zinc-700 dark:text-zinc-300" />
        <span>Đang kiểm tra quyền hạn Quản trị viên...</span>
      </div>
    );
  }

  // 1. Mismatch UUID
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
              Cặp định danh UUID trong đường dẫn không khớp với phiên làm việc của bạn.
            </p>
          </div>

          <div className="bg-zinc-100 dark:bg-zinc-900/80 p-3.5 rounded-lg text-left text-xs font-mono space-y-1.5 border border-zinc-200 dark:border-zinc-800">
            <div className="text-zinc-500 dark:text-zinc-400">
              URL yêu cầu:
              <div className="text-red-600 dark:text-red-400 truncate">
                /{tenantUuidParam?.slice(0, 8)}.../{userUuidParam?.slice(0, 8)}.../users
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
              <span>Đăng xuất</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. Không có quyền ADMIN
  if (isAdmin === false) {
    const validCompUuid = currentUser?.companyUuid || currentUser?.tenant?.uuid;
    const validUserUuid = currentUser?.uuid;

    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-6 text-zinc-900 dark:text-zinc-100 transition-colors">
        <div className="max-w-md w-full nv-card p-8 text-center space-y-6 border border-zinc-200 dark:border-zinc-800 shadow-xl">
          <div className="w-14 h-14 bg-amber-100 dark:bg-amber-950/60 rounded-2xl flex items-center justify-center mx-auto text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50">
            <ShieldX className="w-7 h-7" />
          </div>

          <div className="space-y-2">
            <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Yêu cầu quyền Quản trị viên
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Tài khoản hiện tại của bạn là nhân viên thông thường. Mục quản lý nhân sự chỉ dành riêng cho Quản trị viên doanh nghiệp (ADMIN).
            </p>
          </div>

          <button
            onClick={() => router.replace(`/${validCompUuid}/${validUserUuid}/dashboard`)}
            className="nv-btn-primary w-full py-2.5 text-xs font-semibold flex items-center justify-center gap-2"
          >
            <span>Quay lại Bảng điều khiển chi tiêu</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-zinc-50 dark:bg-zinc-950 font-sans text-zinc-900 dark:text-zinc-100 overflow-hidden selection:bg-zinc-200 dark:selection:bg-zinc-800 transition-colors">
      
      {/* Sidebar điều hướng */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        activeTab="users"
        onTabChange={(tab) => {
          setIsSidebarOpen(false);
          if (tab === 'logout' || tab === 'settings') {
            handleLogout();
          } else if (tab === 'overview' || tab === 'expenses' || tab === 'reports') {
            router.push(`/${tenantUuidParam}/${userUuidParam}/dashboard?tab=${tab}`);
          }
        }}
        tenantName={currentUser?.companyName || 'Doanh nghiệp'}
        userName={currentUser?.name || currentUser?.email || 'Quản trị viên'}
        departmentName={currentUser?.department || 'Ban Giám Đốc'}
        userRole={currentUser?.role || 'ADMIN'}
      />

      {/* Nội dung chính: Quản lý Nhân sự */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* Top Header */}
        <Header
          title="Quản lý Người dùng & Nhân sự"
          onToggleMenu={() => setIsSidebarOpen(true)}
        />

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
          <AdminTeamManagement />
        </div>
      </main>

    </div>
  );
}

export default function TenantUserManagementPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen bg-zinc-50 dark:bg-zinc-950 items-center justify-center text-zinc-400 text-sm">
          Đang nạp dữ liệu quản lý nhân sự...
        </div>
      }
    >
      <TenantUserManagementContent />
    </Suspense>
  );
}
