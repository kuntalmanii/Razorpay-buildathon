/**
 * lib/auth-client.ts
 *
 * Auth-specific API client for authentication endpoints.
 * Separate from api-client.ts to avoid circular deps and keep auth self-contained.
 *
 * All requests use credentials: 'include' so the httpOnly cookie is sent/received automatically.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export interface AuthUser {
  user_id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  is_active: boolean;
  created_at: string;
}

interface AuthApiResponse<T> {
  success: boolean;
  data: T;
  error?: { message: string; fields?: Record<string, string> };
}

async function authFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: 'include', // ensures httpOnly cookie is sent and received
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const body: AuthApiResponse<T> = await res.json();

  if (!res.ok || !body.success) {
    const message = body.error?.message ?? `Request failed (${res.status})`;
    const fields = body.error?.fields;
    const err = new Error(message) as Error & { fields?: Record<string, string>; status?: number };
    err.fields = fields;
    err.status = res.status;
    throw err;
  }

  return body.data;
}

export async function login(
  email: string,
  password: string
): Promise<{ user: AuthUser }> {
  return authFetch<{ user: AuthUser }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function signup(
  name: string,
  email: string,
  password: string
): Promise<{ user: AuthUser }> {
  return authFetch<{ user: AuthUser }>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  });
}

export async function logout(): Promise<void> {
  await authFetch<{ message: string }>('/api/auth/logout', {
    method: 'POST',
  });
}

export async function getMe(): Promise<{ user: AuthUser }> {
  return authFetch<{ user: AuthUser }>('/api/auth/me');
}
