'use client';

/**
 * components/auth/login-form.tsx
 *
 * Login form component using the existing design system tokens.
 * Delegates auth to AuthContext.login().
 * Does not handle routing — the parent page does.
 */

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Eye, EyeOff, LogIn, AlertCircle } from 'lucide-react';

interface LoginFormProps {
  /** Called after a successful login to allow parent to redirect */
  onSuccess?: (role: 'user' | 'admin') => void;
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const { login, user } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;

    setError(null);
    setIsSubmitting(true);

    try {
      await login(email.trim(), password);
      // Role-based redirect handled by parent or middleware — just signal success
      if (onSuccess) {
        const role = (user?.role ?? 'user') as 'user' | 'admin';
        onSuccess(role);
      }
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message || 'Login failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {/* Error banner */}
      {error && (
        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-[#B56F68]/10 border border-[#B56F68]/30 text-[#B56F68] text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Email */}
      <div className="space-y-1.5">
        <label htmlFor="login-email" className="block text-xs font-medium text-[#B7B0A3] tracking-wide uppercase">
          Email
        </label>
        <input
          id="login-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full bg-[#1C1B18] border border-[rgba(242,237,227,0.10)] rounded-lg px-3.5 py-2.5 text-sm text-[#F2EDE3] placeholder-[#817A70] focus:outline-none focus:border-[#B89A62] focus:ring-1 focus:ring-[#B89A62]/40 transition-all"
        />
      </div>

      {/* Password */}
      <div className="space-y-1.5">
        <label htmlFor="login-password" className="block text-xs font-medium text-[#B7B0A3] tracking-wide uppercase">
          Password
        </label>
        <div className="relative">
          <input
            id="login-password"
            type={showPw ? 'text' : 'password'}
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full bg-[#1C1B18] border border-[rgba(242,237,227,0.10)] rounded-lg px-3.5 py-2.5 pr-10 text-sm text-[#F2EDE3] placeholder-[#817A70] focus:outline-none focus:border-[#B89A62] focus:ring-1 focus:ring-[#B89A62]/40 transition-all"
          />
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPw((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#817A70] hover:text-[#B7B0A3] transition-colors"
            aria-label={showPw ? 'Hide password' : 'Show password'}
          >
            {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Forgot password note */}
      <div className="text-right">
        <span className="text-xs text-[#817A70]">Forgot password? Contact your administrator.</span>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isSubmitting || !email.trim() || !password}
        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-[#B89A62] text-[#151513] text-sm font-semibold hover:bg-[#D1B982] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B89A62]/60"
      >
        {isSubmitting ? (
          <span className="w-4 h-4 border-2 border-[#151513]/40 border-t-[#151513] rounded-full animate-spin" />
        ) : (
          <LogIn className="w-4 h-4" />
        )}
        {isSubmitting ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}
