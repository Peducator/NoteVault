'use client';

import React, { useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';

function UsersRedirectContent() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard?tab=users');
  }, [router]);

  return (
    <div className="flex h-screen bg-zinc-50 dark:bg-zinc-950 items-center justify-center text-zinc-500 dark:text-zinc-400 text-sm gap-2">
      <RefreshCw className="w-4 h-4 animate-spin text-zinc-700 dark:text-zinc-300" />
      <span>Đang chuyển hướng đến quản lý thành viên...</span>
    </div>
  );
}

export default function UsersPage() {
  return (
    <Suspense fallback={null}>
      <UsersRedirectContent />
    </Suspense>
  );
}
