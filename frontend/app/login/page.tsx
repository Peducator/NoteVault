'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { LoginForm } from '../components/LoginForm';

export default function LoginPage() {
  const router = useRouter();

  const handleLoginSuccess = (user?: any) => {
    const compUuid = user?.companyUuid || user?.tenant?.uuid;
    const userUuid = user?.uuid;

    if (compUuid && userUuid) {
      router.push(`/${compUuid}/${userUuid}/dashboard`);
    } else {
      router.push('/dashboard');
    }
  };

  return (
    <LoginForm 
      onBackToLanding={() => router.push('/')}
      onGoToRegister={() => router.push('/register-company')}
      onSubmitSuccess={handleLoginSuccess}
    />
  );
}
