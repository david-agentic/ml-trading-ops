'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, ROLE_HOME_PATH, type LoginInput, type Role } from '@ml-trading-ops/shared';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { ApiClientError, apiClient } from '@/lib/api-client';

const REMEMBER_EMAIL_KEY = 'mlt-ops:remember-email';

interface LoginResponse {
  user: { id: string; email: string; name: string; role: Role };
}

export default function LoginPage() {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', rememberEmail: false },
  });

  useEffect(() => {
    const remembered = window.localStorage.getItem(REMEMBER_EMAIL_KEY);
    if (remembered) {
      form.setValue('email', remembered);
      form.setValue('rememberEmail', true);
    }
    // Only ever run once on mount to prefill from a previous session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSubmit(values: LoginInput) {
    setSubmitError(null);
    setSubmitting(true);
    try {
      const { user } = await apiClient.post<LoginResponse>('/auth/login', values);

      if (values.rememberEmail) {
        window.localStorage.setItem(REMEMBER_EMAIL_KEY, values.email);
      } else {
        window.localStorage.removeItem(REMEMBER_EMAIL_KEY);
      }

      router.push(ROLE_HOME_PATH[user.role]);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setSubmitError(
          err.code === 'RATE_LIMITED'
            ? 'Too many attempts. Please wait a few minutes and try again.'
            : err.message,
        );
      } else {
        setSubmitError('Something went wrong. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <p className="text-eyebrow text-text-tertiary">WELCOME BACK</p>
      <h1 className="mt-1 text-h2 text-text-primary">Sign in to your account</h1>
      <p className="mt-1 text-body-sm text-text-secondary">Enter your credentials to continue</p>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-5" noValidate>
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" autoComplete="email" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input type="password" autoComplete="current-password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="rememberEmail"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center gap-2 space-y-0">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <FormLabel className="font-normal">Remember my email</FormLabel>
              </FormItem>
            )}
          />

          {submitError && <p className="text-body-sm font-medium text-danger-500">{submitError}</p>}

          <Button type="submit" variant="primary" size="lg" className="w-full" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
      </Form>

      <div className="mt-3 text-center text-body-sm">
        <Link href="/forgot-password" className="text-accent-500 hover:underline">
          Forgot password?
        </Link>
      </div>
    </>
  );
}
