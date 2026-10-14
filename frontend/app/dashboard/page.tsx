'use client';

import React, { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { RefreshCw } from 'lucide-react';
import { userApi } from '../apis/userApi';

function DashboardRedirectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab');

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
        const user = JSON.parse(storedUserStr);
        const compUuid = user.companyUuid || user.tenant?.uuid;
        const uUuid = user.uuid;

        if (compUuid && uUuid) {
          const destination = `/${compUuid}/${uUuid}/dashboard${tab ? `?tab=${tab}` : ''}`;
          router.replace(destination);
          return;
        }
      } catch (e) {
        // ignore
      }
    }

    // Nếu localStorage chưa có đầy đủ UUID, gọi API Profile để lấy
    userApi.getProfile()
      .then((res) => {
        if (res.success && res.data) {
          const compUuid = res.data.tenant?.uuid || res.data.companyUuid;
          const uUuid = res.data.uuid;

          if (compUuid && uUuid) {
            localStorage.setItem('nv_user', JSON.stringify({
              ...res.data,
              companyName: res.data.tenant?.companyName || res.data.companyName,
              companyUuid: compUuid,
            }));
            const destination = `/${compUuid}/${uUuid}/dashboard${tab ? `?tab=${tab}` : ''}`;
            router.replace(destination);
          } else {
            router.replace('/login');
          }
        } else {
          router.replace('/login');
        }
      })
      .catch(() => {
        router.replace('/login');
      });
  }, [router, tab]);

  return (
    <div className="flex h-screen bg-zinc-50 dark:bg-zinc-950 items-center justify-center text-zinc-500 dark:text-zinc-400 text-sm gap-2 transition-colors">
      <RefreshCw className="w-4 h-4 animate-spin text-zinc-700 dark:text-zinc-300" />
      <span>Đang điều hướng đến không gian làm việc bảo mật UUID...</span>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen bg-zinc-50 dark:bg-zinc-950 items-center justify-center text-zinc-400 text-sm">
          Đang nạp...
        </div>
      }
    >
      <DashboardRedirectContent />
    </Suspense>
  );
}
