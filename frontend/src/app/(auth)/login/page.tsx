'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LoginForm } from '@/components/auth/login-form';
import { useAuth } from '@/contexts/auth-context';

export default function LoginPage() {
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

  const handleSuccess = (role: 'user' | 'admin') => {
    if (role === 'admin') {
      router.push('/admin');
    } else {
      router.push('/dashboard');
    }
  };

  return (
    <div className="p-8 rounded-xl bg-[#1C1B18] border border-[rgba(242,237,227,0.10)] shadow-2xl space-y-6">
      <div className="space-y-1 text-center">
        <h1 className="text-xl font-semibold text-[#F2EDE3] tracking-tight">Sign in to RecoverIQ</h1>
        <p className="text-xs text-[#B7B0A3]">
          Access your autonomous revenue recovery telemetry & policy control
        </p>
      </div>

      <LoginForm onSuccess={handleSuccess} />

      <div className="pt-4 border-t border-[rgba(242,237,227,0.06)] flex flex-col gap-2.5 text-center text-xs text-[#817A70]">
        <div>
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-[#B89A62] hover:text-[#D1B982] underline transition-colors">
            Register as merchant
          </Link>
        </div>
        <div className="bg-[#181714] p-3 rounded-lg border border-[rgba(242,237,227,0.04)] text-left font-mono text-[11px] space-y-1">
          <div className="text-[#B7B0A3] font-semibold">Demo Credentials:</div>
          <div className="text-[#6F9B7A]">Operator: <span className="text-[#F2EDE3]">user@recoveriq.dev</span> / <span className="text-[#F2EDE3]">User@123</span></div>
          <div className="text-[#B89A62]">Admin: <span className="text-[#F2EDE3]">admin@recoveriq.dev</span> / <span className="text-[#F2EDE3]">Admin@123</span></div>
        </div>
      </div>
    </div>
  );
}
