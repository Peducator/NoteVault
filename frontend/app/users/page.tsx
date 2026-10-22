'use client';

import React, { useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { Spin, Flex } from 'antd';

function UsersRedirectContent() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard?tab=users');
  }, [router]);

  return (
    <Flex justify="center" align="center" style={{ height: '100vh' }}>
      <Spin size="large" tip="Đang chuyển hướng đến quản lý thành viên..." />
    </Flex>
  );
}

export default function UsersPage() {
  return (
    <Suspense fallback={null}>
      <UsersRedirectContent />
    </Suspense>
  );
}
