'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { LoginForm } from '../components/LoginForm';

export default function LoginPage() {
  const router = useRouter();

  const handleLoginSuccess = () => {
    router.push('/dashboard');
  };

  return (
    <LoginForm 
      onBackToLanding={() => router.push('/')}
      onGoToRegister={() => router.push('/register-company')}
      onSubmitSuccess={handleLoginSuccess}
    />
  );
}
