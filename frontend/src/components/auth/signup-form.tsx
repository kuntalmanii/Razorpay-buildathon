'use client';

/**
 * components/auth/signup-form.tsx
 *
 * Registration form component using existing design tokens.
 * Collects name, email, password, and confirm password.
 * Delegates creation to AuthContext.signup().
 */

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { Eye, EyeOff, UserPlus, AlertCircle } from 'lucide-react';

interface SignupFormProps {
  onSuccess?: () => void;
}

export function SignupForm({ onSuccess }: SignupFormProps) {
  const { signup } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password) return;

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await signup(name.trim(), email.trim(), password);
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message || 'Registration failed. Please try again.');
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

      {/* Name */}
      <div className="space-y-1.5">
        <label htmlFor="signup-name" className="block text-xs font-medium text-[#B7B0A3] tracking-wide uppercase">
          Full Name
        </label>
        <input
          id="signup-name"
          type="text"
          autoComplete="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Rohit Sharma"
          className="w-full bg-[#1C1B18] border border-[rgba(242,237,227,0.10)] rounded-lg px-3.5 py-2.5 text-sm text-[#F2EDE3] placeholder-[#817A70] focus:outline-none focus:border-[#B89A62] focus:ring-1 focus:ring-[#B89A62]/40 transition-all"
        />
      </div>

      {/* Email */}
      <div className="space-y-1.5">
        <label htmlFor="signup-email" className="block text-xs font-medium text-[#B7B0A3] tracking-wide uppercase">
          Work Email
        </label>
        <input
          id="signup-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="operator@company.com"
          className="w-full bg-[#1C1B18] border border-[rgba(242,237,227,0.10)] rounded-lg px-3.5 py-2.5 text-sm text-[#F2EDE3] placeholder-[#817A70] focus:outline-none focus:border-[#B89A62] focus:ring-1 focus:ring-[#B89A62]/40 transition-all"
        />
      </div>

      {/* Password */}
      <div className="space-y-1.5">
        <label htmlFor="signup-password" className="block text-xs font-medium text-[#B7B0A3] tracking-wide uppercase">
          Password (min 8 chars)
        </label>
        <div className="relative">
          <input
            id="signup-password"
            type={showPw ? 'text' : 'password'}
            autoComplete="new-password"
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

      {/* Confirm Password */}
      <div className="space-y-1.5">
        <label htmlFor="signup-confirm-password" className="block text-xs font-medium text-[#B7B0A3] tracking-wide uppercase">
          Confirm Password
        </label>
        <input
          id="signup-confirm-password"
          type={showPw ? 'text' : 'password'}
          autoComplete="new-password"
          required
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="••••••••"
          className="w-full bg-[#1C1B18] border border-[rgba(242,237,227,0.10)] rounded-lg px-3.5 py-2.5 text-sm text-[#F2EDE3] placeholder-[#817A70] focus:outline-none focus:border-[#B89A62] focus:ring-1 focus:ring-[#B89A62]/40 transition-all"
        />
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isSubmitting || !name.trim() || !email.trim() || !password || !confirmPassword}
        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-[#B89A62] text-[#151513] text-sm font-semibold hover:bg-[#D1B982] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B89A62]/60"
      >
        {isSubmitting ? (
          <span className="w-4 h-4 border-2 border-[#151513]/40 border-t-[#151513] rounded-full animate-spin" />
        ) : (
          <UserPlus className="w-4 h-4" />
        )}
        {isSubmitting ? 'Creating account…' : 'Create Merchant Account'}
      </button>

      <div className="text-center pt-2">
        <span className="text-xs text-[#817A70]">
          Already have an account?{' '}
          <Link href="/login" className="text-[#B89A62] hover:text-[#D1B982] underline transition-colors">
            Sign in
          </Link>
        </span>
      </div>
    </form>
  );
}
