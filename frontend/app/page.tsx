import { LandingPage } from './components/LandingPage';
import Link from 'next/link';

export default function RootLandingPage() {
  return (
    <LandingPage 
      loginHref="/login"
      registerHref="/register-company"
    />
  );
}
