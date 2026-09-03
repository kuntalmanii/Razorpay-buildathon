/**
 * pages/auth/index.ts
 *
 * Re-exports the auth screens and components for RecoverIQ.
 */

export { default as LoginPage } from '@/app/(auth)/login/page';
export { default as SignupPage } from '@/app/(auth)/signup/page';
export { default as ForgotPasswordPage } from '@/app/(auth)/forgot-password/page';
export { LoginForm } from '@/components/auth/login-form';
export { SignupForm } from '@/components/auth/signup-form';
