'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { CompanyRegister } from '../components/CompanyRegister';

export default function RegisterCompanyPage() {
  const router = useRouter();

  return (
    <CompanyRegister 
      onBackToLanding={() => router.push('/')}
      onGoToLogin={() => router.push('/login')}
      onSubmitSuccess={() => router.push('/login')}
    />
  );
}
