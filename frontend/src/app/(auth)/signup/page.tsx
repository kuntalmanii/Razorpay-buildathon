'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SignupForm } from '@/components/auth/signup-form';
import { useAuth } from '@/contexts/auth-context';

export default function SignupPage() {
  const router = useRouter();
  const { user, isReady } = useAuth();

  useEffect(() => {
    if (isReady && user) {
      if (user.role === 'admin') {
        router.replace('/admin');
      } else {
        router.replace('/dashboard');
      }
    }
  }, [isReady, user, router]);

  const handleSuccess = () => {
    router.push('/dashboard');
  };

  return (
    <div className="p-8 rounded-xl bg-[#1C1B18] border border-[rgba(242,237,227,0.10)] shadow-2xl space-y-6">
      <div className="space-y-1 text-center">
        <h1 className="text-xl font-semibold text-[#F2EDE3] tracking-tight">Create Merchant Account</h1>
        <p className="text-xs text-[#B7B0A3]">
          Start recovering failed recurring payments and subscriber revenue
        </p>
      </div>

      <SignupForm onSuccess={handleSuccess} />
    </div>
  );
}
